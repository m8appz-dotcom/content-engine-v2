import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import path from "node:path";
import { tmpdir } from "node:os";
import { mkdtempSync, rmSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createDemoServer, invitationHash } from "../server.mjs";
import engine from "../engine-adapter.mjs";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../public",
);
const origin = "https://content.example.test";
const invitation = Buffer.alloc(32, 9).toString("base64url");
test("hosted deployment rejects insecure origins, capture and exposed storage", () => {
  for (const invalid of [
    "http://content.example.test",
    "https://localhost",
    "https://127.0.0.1",
    origin + "/path",
    "https://user@content.example.test",
    origin + "/",
    "https://content.example.test:8443",
  ])
    assert.throws(() => createDemoServer({ origin: invalid, hosted: true }));
  assert.throws(() =>
    createDemoServer({ origin, hosted: true, enableCapture: true }),
  );
  assert.throws(() =>
    createDemoServer({
      origin,
      hosted: true,
      root,
      storePath: path.join(root, "state.json"),
    }),
  );
  assert.throws(() => createDemoServer({ origin }));
});

test("HTTPS contract enforces exact host/origin/RP, single-use challenges and real protected engine execution", async (t) => {
  const state = mkdtempSync(path.join(tmpdir(), "hosted-content-test-"));
  const secret = "isolated-test-service-identity-32-bytes-long";
  const previous = process.env.DEMO_SERVICE_TOKEN;
  process.env.DEMO_SERVICE_TOKEN = secret;
  const server = createDemoServer({
    hosted: true,
    registrationInvites: [invitationHash(invitation)],
    origin,
    root,
    storePath: path.join(state, "workspace.json"),
    engine,
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    assert.ok(
      path
        .resolve(state)
        .startsWith(path.resolve(tmpdir()) + path.sep + "hosted-content-test-"),
    );
    rmSync(state, { recursive: true });
    if (previous === undefined) delete process.env.DEMO_SERVICE_TOKEN;
    else process.env.DEMO_SERVICE_TOKEN = previous;
  });
  const request = (route, method = "GET", value, headers = {}) =>
    new Promise((resolve, reject) => {
      const req = http.request(
        {
          host: "127.0.0.1",
          port: server.address().port,
          path: route,
          method,
          headers: {
            Host: "content.example.test",
            Origin: origin,
            "Content-Type": "application/json",
            ...headers,
          },
        },
        (res) => {
          let body = "";
          res.on("data", (b) => (body += b));
          res.on("end", () =>
            resolve({ status: res.statusCode, headers: res.headers, body }),
          );
        },
      );
      req.on("error", reject);
      req.end(value === undefined ? undefined : JSON.stringify(value));
    });
  const home = await request("/");
  assert.equal(home.status, 200);
  assert.equal(home.headers["strict-transport-security"], "max-age=31536000");
  assert.equal(
    (await request("/", "GET", undefined, { Host: "attacker.example" })).status,
    400,
  );
  assert.equal(
    (
      await request(
        "/auth/register/options",
        "POST",
        {},
        { Origin: "https://attacker.example" },
      )
    ).status,
    403,
  );
  const options = await request("/auth/register/options", "POST", {
    invite: invitation,
  });
  const registration = JSON.parse(options.body);
  assert.equal(registration.rp.id, "content.example.test");
  assert.equal(
    registration.authenticatorSelection.userVerification,
    "required",
  );
  const cookie = options.headers["set-cookie"][0].split(";")[0];
  assert.match(
    options.headers["set-cookie"][0],
    /HttpOnly; SameSite=Strict; Secure/,
  );
  assert.equal(
    (
      await request(
        "/auth/register/verify",
        "POST",
        { id: "invalid" },
        { Cookie: cookie },
      )
    ).status,
    400,
  );
  assert.match(
    (await request("/auth/register/verify", "POST", {}, { Cookie: cookie }))
      .body,
    /already used/,
  );
  assert.equal(
    JSON.parse((await request("/auth/status")).body).signedIn,
    false,
  );
  assert.equal(
    (await request("/engine/run", "POST", { action: "plan", data: {} })).status,
    401,
  );
  assert.equal(existsSync(path.join(state, "engine")), false);
  for (const route of [
    "/__capture",
    "/hosted-server.mjs",
    "/.env",
    "/.demo-state/workspaces.json",
  ])
    assert.equal((await request(route)).status, 404);
  const auth = { Authorization: "Bearer " + secret };
  const started = await request(
    "/engine/run",
    "POST",
    {
      action: "plan",
      data: {
        script:
          "Every public claim needs an evidence reference. Review the source before approving a draft. The storyboard keeps a timed record of that script.",
        claim: "Claims map to evidence references.",
      },
    },
    auth,
  );
  assert.equal(started.status, 202);
  const id = JSON.parse(started.body).id;
  let job;
  for (let i = 0; i < 60; i++) {
    job = JSON.parse(
      (await request("/engine/jobs/" + id, "GET", undefined, auth)).body,
    );
    if (job.status !== "running") break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.equal(job.status, "complete", JSON.stringify(job.error));
  assert.equal(job.result.liveProviderCalls, 0);
  assert.ok(job.result.scenes.length >= 3);
  assert.equal((await request("/engine/jobs/" + id)).status, 404);
  assert.equal(
    (await request(job.files[0].url, "GET", undefined, auth)).status,
    200,
  );
  for (let i = 0; i < 299; i++)
    mkdirSync(path.join(state, "engine", "capacity-" + i));
  const full = await request("/engine/run", "POST", { action: "plan" }, auth);
  assert.equal(full.status, 429);
  assert.equal(JSON.parse(full.body).code, "storage_capacity");
  // A single visitor must not consume every other visitor's login quota through the tunnel.
  for (let i = 0; i < 120; i++)
    assert.equal(
      (
        await request("/auth/status", "GET", undefined, {
          "CF-Connecting-IP": "192.0.2.10",
        })
      ).status,
      200,
    );
  assert.equal(
    (
      await request("/auth/status", "GET", undefined, {
        "CF-Connecting-IP": "192.0.2.10",
      })
    ).status,
    429,
  );
  assert.equal(
    (
      await request("/auth/status", "GET", undefined, {
        "CF-Connecting-IP": "192.0.2.11",
      })
    ).status,
    200,
  );
  let fallback;
  for (let i = 0; i < 121; i++) {
    fallback = await request("/auth/status", "GET", undefined, {
      "CF-Connecting-IP": "not-an-ip",
    });
    if (fallback.status === 429) break;
  }
  assert.equal(fallback.status, 429);
  assert.equal(
    (
      await request("/auth/status", "GET", undefined, {
        "X-Forwarded-For": "192.0.2.99",
      })
    ).status,
    429,
  );
  assert.equal(
    (
      await request("/auth/status", "GET", undefined, {
        "CF-Connecting-IP": "192.0.2.12",
      })
    ).status,
    200,
  );
});
