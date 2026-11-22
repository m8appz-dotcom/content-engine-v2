import {
  realpathSync,
  lstatSync,
  statSync,
  readFileSync,
  mkdirSync,
  copyFileSync,
  chmodSync,
  symlinkSync,
  renameSync,
  unlinkSync,
  existsSync,
  openSync,
  closeSync,
  constants,
} from "node:fs";
import path from "node:path";
import { homedir, userInfo } from "node:os";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import http from "node:http";
import { fileURLToPath } from "node:url";
const service = "content-workspace.service";
const inside = (root, target) => target.startsWith(root + path.sep);
function command(executable, args, cwd) {
  const result = spawnSync(executable, args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 1000000,
    timeout: 120000,
  });
  if (result.status !== 0)
    throw Error(
      "A deployment check failed. The original release and data must be retained.",
    );
  return result.stdout.trim();
}
function activeMemoryMiB() {
  const bytes = Number(
    command("systemctl", [
      "--user",
      "show",
      service,
      "--property=MemoryMax",
      "--value",
    ]),
  );
  if (!Number.isFinite(bytes) || bytes <= 0)
    throw Error("Set a finite unit memory budget before deployment.");
  return bytes / 1048576;
}
function runtimeConfiguration() {
  const file = path.join(
    homedir(),
    ".config",
    "portfolio-content",
    "runtime.env",
  );
  const env = Object.fromEntries(
    readFileSync(file, "utf8")
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const i = line.indexOf("=");
        return [line.slice(0, i), line.slice(i + 1)];
      }),
  );
  const origin = new URL(env.WORKSPACE_ORIGIN),
    port = Number(env.PORT);
  if (
    origin.protocol !== "https:" ||
    origin.origin !== env.WORKSPACE_ORIGIN ||
    !Number.isInteger(port) ||
    port < 1024 ||
    port > 65535
  )
    throw Error(
      "Verify the existing private runtime configuration before deployment.",
    );
  return {
    file,
    origin,
    port,
    storePath: path.join(env.WORKSPACE_STATE || "", "workspaces.json"),
  };
}
function unitProperty(name) {
  return command("systemctl", [
    "--user",
    "show",
    service,
    "--property=" + name,
    "--value",
  ]);
}
export function assertUnitBinding(root, settings, properties) {
  if (
    properties.workingDirectory !== path.join(root, "current") ||
    properties.environmentFiles !== settings.file + " (ignore_errors=no)" ||
    !properties.execStart.startsWith(
      "{ path=/usr/bin/node ; argv[]=/usr/bin/node demo/hosted-server.mjs ; ignore_errors=no ;",
    )
  )
    throw Error(
      "The application, environment and Node runtime must match the real dedicated unit.",
    );
}
function unitConfiguration(root, settings) {
  assertUnitBinding(root, settings, {
    workingDirectory: unitProperty("WorkingDirectory"),
    environmentFiles: unitProperty("EnvironmentFiles"),
    execStart: unitProperty("ExecStart"),
  });
  if (realpathSync(process.execPath) !== realpathSync("/usr/bin/node"))
    throw Error("Run this switcher with the dedicated unit's /usr/bin/node.");
}
function verifyRunning(release) {
  const pid = Number(unitProperty("MainPID"));
  if (
    unitProperty("ActiveState") !== "active" ||
    !Number.isInteger(pid) ||
    pid <= 0 ||
    realpathSync("/proc/" + pid + "/cwd") !== release ||
    realpathSync("/proc/" + pid + "/exe") !== realpathSync("/usr/bin/node")
  )
    throw Error("The dedicated unit is not running the selected release.");
}
function cleanCandidate(candidate, expectedHead) {
  if (
    realpathSync(
      command("git", ["rev-parse", "--show-toplevel"], candidate),
    ) !== candidate ||
    command("git", ["rev-parse", "HEAD"], candidate) !== expectedHead ||
    command(
      "git",
      [
        "status",
        "--porcelain",
        "--untracked-files=all",
        "--",
        ".",
        ":(exclude)node_modules",
        ":(exclude)demo/node_modules",
      ],
      candidate,
    )
  )
    throw Error(
      "The candidate must be clean and match its immutable source revision.",
    );
}
async function reachable(config) {
  for (let attempt = 0; attempt < 12; attempt++) {
    const ready = await new Promise((resolve) => {
      const request = http.get(
        {
          hostname: "127.0.0.1",
          port: config.port,
          path: "/auth/status",
          headers: { Host: config.origin.host },
          timeout: 500,
        },
        (response) => {
          let body = "";
          response.on("data", (chunk) => {
            body += chunk;
            if (body.length > 10000) request.destroy();
          });
          response.on("end", () => {
            try {
              resolve(
                response.statusCode === 200 &&
                  JSON.parse(body).passkeys === true,
              );
            } catch {
              resolve(false);
            }
          });
        },
      );
      request.on("timeout", () => request.destroy());
      request.on("error", () => resolve(false));
    });
    if (ready) return;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw Error("The new workspace did not become ready.");
}
// Hooks are internal test seams. The CLI always uses the real unit and isolated preflight.
export async function deployRelease(
  { appRoot, release, storePath, expectedHead },
  hooks = {},
) {
  if (process.platform !== "linux")
    throw Error("This release switcher requires Linux user services.");
  const root = realpathSync(appRoot),
    candidate = realpathSync(release),
    releases = realpathSync(path.join(root, "releases"));
  if (
    path.basename(root) !== "portfolio-content" ||
    !inside(root, releases) ||
    !inside(releases, candidate) ||
    statSync(root).uid !== userInfo().uid
  )
    throw Error(
      "Use the owned portfolio-content app and one of its immutable releases.",
    );
  if (
    !path.isAbsolute(storePath) ||
    inside(releases, path.resolve(storePath)) ||
    !/^[a-f0-9]{40}$/.test(expectedHead)
  )
    throw Error("Verify the private store and immutable source revision.");
  const current = path.join(root, "current");
  if (!lstatSync(current).isSymbolicLink())
    throw Error(
      "Preserve an existing current-release symlink before upgrading.",
    );
  const previous = realpathSync(current);
  if (!inside(releases, previous) || previous === candidate)
    throw Error("Keep a distinct immutable rollback release.");
  const lock = path.join(root, ".deploy.lock"),
    fd = openSync(lock, "wx", 0o600);
  let switched = false,
    stopped = false;
  const stop =
    hooks.stop || (() => command("systemctl", ["--user", "stop", service]));
  const restart =
    hooks.restart ||
    (() => command("systemctl", ["--user", "restart", service]));
  const memory = hooks.memoryMiB || activeMemoryMiB;
  const config = hooks.configuration || runtimeConfiguration;
  const health = hooks.health || reachable;
  const bind = hooks.unitConfiguration || unitConfiguration;
  const running = hooks.verifyRunning || verifyRunning;
  const nonce = randomBytes(8).toString("hex"),
    next = path.join(root, "current.next-" + nonce);
  try {
    cleanCandidate(candidate, expectedHead);
    command(process.execPath, ["demo/sync-runtime.mjs", "--check"], candidate);
    const settings = config();
    bind(root, settings);
    if (path.resolve(settings.storePath) !== path.resolve(storePath))
      throw Error(
        "The selected store does not match the running unit configuration.",
      );
    const budget = memory();
    const preflight = () => {
      const result = spawnSync(
        process.execPath,
        [
          path.join(candidate, "demo", "preflight-store.mjs"),
          storePath,
          String(budget),
        ],
        {
          cwd: candidate,
          encoding: "utf8",
          maxBuffer: 1000000,
          timeout: 120000,
        },
      );
      if (result.status !== 0)
        throw Error(
          "Store migration is required. No release pointer changed; retain the original store and migrate offline.",
        );
      return JSON.parse(result.stdout);
    };
    preflight();
    // No state, release pointer or service mutation occurs before the isolated gate above.
    if (realpathSync(current) !== previous)
      throw Error("Another deployment changed the release; preserve its work.");
    // Quiesce only this dedicated unit after the live check passes. Recheck its
    // final store to close the race with a save during the first preflight.
    stopped = true;
    await stop();
    cleanCandidate(candidate, expectedHead);
    const report = preflight();
    const backup = path.join(root, "backups", Date.now() + "-" + nonce);
    mkdirSync(backup, { recursive: true, mode: 0o700 });
    if (existsSync(storePath)) {
      copyFileSync(
        storePath,
        path.join(backup, "workspaces.json"),
        constants.COPYFILE_EXCL,
      );
      chmodSync(path.join(backup, "workspaces.json"), 0o600);
    }
    copyFileSync(
      settings.file,
      path.join(backup, "runtime.env"),
      constants.COPYFILE_EXCL,
    );
    chmodSync(path.join(backup, "runtime.env"), 0o600);
    symlinkSync(candidate, next);
    renameSync(next, current);
    switched = true;
    await restart();
    await health(settings);
    await running(candidate);
    stopped = false;
    return {
      sourceRevision: expectedHead,
      previousRelease: previous,
      backup,
      preflight: report,
    };
  } catch (error) {
    if (switched && realpathSync(current) === candidate) {
      const rollback = path.join(root, "current.rollback-" + nonce);
      symlinkSync(previous, rollback);
      renameSync(rollback, current);
      await restart();
      await health(config());
      await running(previous);
      stopped = false;
    }
    if (stopped && !switched) {
      await restart();
      await health(config());
      await running(previous);
    }
    throw error;
  } finally {
    if (existsSync(next)) unlinkSync(next);
    closeSync(fd);
    unlinkSync(lock);
  }
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const [appRoot, release, storePath, expectedHead] = process.argv.slice(2);
  try {
    console.log(
      JSON.stringify(
        await deployRelease({ appRoot, release, storePath, expectedHead }),
      ),
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
