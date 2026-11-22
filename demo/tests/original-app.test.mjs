import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createOriginalAppGateway } from "../original-app-gateway.mjs";
test("the original app shell is public while API identity and encoded route aliases fail closed", async (t) => {
  const state = mkdtempSync(path.join(tmpdir(), "content-original-gateway-"));
  const origin = "http://localhost:9876";
  let calls = 0;
  const server = createOriginalAppGateway({
    origin,
    storePath: path.join(state, "workspaces.json"),
    nextHandler: async (req, res) => {
      calls++;
      assert.equal(req.headers["x-content-account"], undefined);
      res.end("original-app");
    },
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    rmSync(state, { recursive: true, force: true });
  });
  const request = (route) =>
    new Promise((resolve, reject) => {
      const req = http.request(
        {
          host: "127.0.0.1",
          port: server.address().port,
          path: route,
          headers: {
            Host: "localhost:9876",
            "x-content-account": "a".repeat(64),
          },
        },
        (res) => {
          let body = "";
          res.on("data", (x) => (body += x));
          res.on("end", () =>
            resolve({ status: res.statusCode, headers: res.headers, body }),
          );
        },
      );
      req.on("error", reject);
      req.end();
    });
  const shell = await request("/app");
  assert.equal(shell.status, 200);
  assert.equal(shell.body, "original-app");
  assert.match(shell.headers["content-security-policy"], /nonce-/);
  assert.doesNotMatch(shell.headers["content-security-policy"], /unsafe-eval/);
  for (const route of [
    "/app/api/jobs",
    "/app/api/reviewer",
    "/app/api/jobs/project/drafts/draft/media",
  ])
    assert.equal((await request(route)).status, 401);
  for (const route of [
    "/app/%61pi/jobs",
    "/app/api%2fjobs",
    "/app/%2561pi/jobs",
    "/application/api/jobs",
  ])
    assert.equal((await request(route)).status, 404);
  assert.equal(calls, 1);
});
