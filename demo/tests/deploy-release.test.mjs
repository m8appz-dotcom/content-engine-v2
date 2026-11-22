import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  cpSync,
  symlinkSync,
  realpathSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { deployRelease, assertUnitBinding } from "../deploy-release.mjs";
const demo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Temporary filesystem fixtures and service hooks never control a real unit.
function fixture(t) {
  const temp = mkdtempSync(path.join(tmpdir(), "content-release-test-"));
  t.after(() => {
    assert.ok(temp.startsWith(path.join(tmpdir(), "content-release-test-")));
    rmSync(temp, { recursive: true });
  });
  const appRoot = path.join(temp, "portfolio-content"),
    release = path.join(appRoot, "releases", "candidate"),
    previous = path.join(appRoot, "releases", "previous");
  mkdirSync(previous, { recursive: true });
  mkdirSync(release);
  cpSync(demo, path.join(release, "demo"), {
    recursive: true,
    filter: (source) =>
      !["node_modules", "tests"].includes(path.basename(source)),
  });
  symlinkSync(
    realpathSync(path.join(demo, "node_modules")),
    path.join(release, "demo", "node_modules"),
    "dir",
  );
  const git = (args) =>
    execFileSync("git", args, {
      cwd: release,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  git(["init", "--quiet"]);
  git(["add", "demo"]);
  git([
    "-c",
    "user.name=Local test fixture",
    "-c",
    "user.email=fixture@example.invalid",
    "commit",
    "--quiet",
    "-m",
    "Isolated deployment fixture",
  ]);
  symlinkSync(previous, path.join(appRoot, "current"));
  const storePath = path.join(temp, "workspaces.json"),
    file = path.join(temp, "runtime.env");
  writeFileSync(
    storePath,
    JSON.stringify({ version: 1, users: {}, credentials: {}, workspaces: {} }),
  );
  writeFileSync(file, "private fixture configuration\n");
  const calls = [],
    hooks = {
      unitConfiguration: () => {},
      verifyRunning: () => calls.push("running"),
      memoryMiB: () => 768,
      configuration: () => ({ file, storePath }),
      stop: () => calls.push("stop"),
      restart: () => calls.push("restart"),
      health: () => calls.push("health"),
    };
  return {
    options: {
      appRoot,
      release,
      storePath,
      expectedHead: git(["rev-parse", "HEAD"]),
    },
    hooks,
    calls,
    previous,
    file,
    current: path.join(appRoot, "current"),
  };
}
const linux = { skip: process.platform !== "linux" };
test(
  "current-pointer and active-process drift refuses before stopping the previous service",
  linux,
  async (t) => {
    const f = fixture(t);
    f.hooks.verifyRunning = () => {
      throw Error("active release drift");
    };
    await assert.rejects(
      deployRelease(f.options, f.hooks),
      /active release drift/,
    );
    assert.deepEqual(f.calls, []);
    assert.equal(realpathSync(f.current), f.previous);
  },
);
test(
  "parent-valid 8.55 MB original store requires migration before any stop, pointer change or restart",
  linux,
  async (t) => {
    const f = fixture(t),
      db = { version: 1, users: {}, credentials: {}, workspaces: {} };
    for (let i = 0; i < 9; i++) {
      const user = "user-" + i;
      db.users[user] = { id: user, name: "Persistence fixture" };
      for (const slot of ["content", "jev", "toolkit", "voice", "film"])
        db.workspaces[user + ":" + slot] = { draft: "x".repeat(190000) };
    }
    const original = JSON.stringify(db);
    assert.ok(Buffer.byteLength(original) > 8 * 1024 * 1024);
    writeFileSync(f.options.storePath, original);
    await assert.rejects(
      deployRelease(f.options, f.hooks),
      /migration is required/,
    );
    assert.deepEqual(f.calls, []);
    assert.equal(realpathSync(f.current), f.previous);
    assert.equal(readFileSync(f.options.storePath, "utf8"), original);
    assert.equal(existsSync(path.join(f.options.appRoot, "backups")), false);
    assert.equal(
      existsSync(path.join(f.options.appRoot, ".deploy.lock")),
      false,
    );
  },
);
test(
  "compatible candidate switches only after final quiesced preflight and preserves private backups",
  linux,
  async (t) => {
    const f = fixture(t),
      before = readFileSync(f.options.storePath),
      receipt = await deployRelease(f.options, f.hooks);
    assert.deepEqual(f.calls, [
      "running",
      "stop",
      "restart",
      "health",
      "running",
    ]);
    assert.equal(realpathSync(f.current), f.options.release);
    assert.deepEqual(readFileSync(f.options.storePath), before);
    assert.deepEqual(
      readFileSync(path.join(receipt.backup, "workspaces.json")),
      before,
    );
    assert.equal(
      statSync(path.join(receipt.backup, "runtime.env")).mode & 0o777,
      0o600,
    );
  },
);
test(
  "failed readiness restores the previous release without restoring or deleting live data",
  linux,
  async (t) => {
    const f = fixture(t),
      before = readFileSync(f.options.storePath);
    f.hooks.health = () => {
      f.calls.push("health");
      if (f.calls.filter((x) => x === "health").length === 1)
        throw Error("readiness fixture failure");
    };
    await assert.rejects(
      deployRelease(f.options, f.hooks),
      /readiness fixture failure/,
    );
    assert.deepEqual(f.calls, [
      "running",
      "stop",
      "restart",
      "health",
      "restart",
      "health",
      "running",
    ]);
    assert.equal(realpathSync(f.current), f.previous);
    assert.deepEqual(readFileSync(f.options.storePath), before);
  },
);
test(
  "save racing the live preflight is rechecked with the unit quiesced, restoring the old unit",
  linux,
  async (t) => {
    const f = fixture(t);
    f.hooks.stop = () => {
      f.calls.push("stop");
      writeFileSync(f.options.storePath, " ".repeat(9 * 1024 * 1024));
    };
    await assert.rejects(
      deployRelease(f.options, f.hooks),
      /migration is required/,
    );
    assert.deepEqual(f.calls, [
      "running",
      "stop",
      "restart",
      "health",
      "running",
    ]);
    assert.equal(realpathSync(f.current), f.previous);
    assert.equal(statSync(f.options.storePath).size, 9 * 1024 * 1024);
  },
);
test("unit binding rejects another app directory, environment and Node launch command", () => {
  const root = "/home/operator/apps/portfolio-content",
    settings = { file: "/home/operator/.config/portfolio-content/runtime.env" };
  const good = {
    workingDirectory: root + "/current",
    environmentFiles: settings.file + " (ignore_errors=no)",
    execStart:
      "{ path=/usr/bin/node ; argv[]=/usr/bin/node demo/hosted-server.mjs ; ignore_errors=no ; pid=123 }",
  };
  assert.doesNotThrow(() => assertUnitBinding(root, settings, good));
  for (const change of [
    { workingDirectory: "/tmp/portfolio-content/current" },
    { environmentFiles: "/tmp/runtime.env (ignore_errors=no)" },
    { execStart: good.execStart.replace("/usr/bin/node", "/tmp/node") },
  ])
    assert.throws(
      () => assertUnitBinding(root, settings, { ...good, ...change }),
      /must match/,
    );
});
test(
  "dirty tracked or untracked candidate source refuses before any unit mutation",
  linux,
  async (t) => {
    for (const name of ["hosted-server.mjs", "unexpected-source.mjs"]) {
      const f = fixture(t);
      writeFileSync(
        path.join(f.options.release, "demo", name),
        "throw Error('uncommitted source');",
      );
      await assert.rejects(deployRelease(f.options, f.hooks), /must be clean/);
      assert.deepEqual(f.calls, []);
      assert.equal(realpathSync(f.current), f.previous);
    }
  },
);
