import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync, readFileSync } from "node:fs";
import next from "next";
import engine from "./engine-adapter.mjs";
import { createOriginalAppGateway } from "./original-app-gateway.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const origin = process.env.WORKSPACE_ORIGIN,
  state = process.env.WORKSPACE_STATE,
  port = Number(process.env.PORT);
const development = process.env.NODE_ENV !== "production";
if (
  development &&
  origin &&
  !["localhost", "127.0.0.1", "[::1]"].includes(new URL(origin).hostname)
)
  throw Error("A hosted origin requires NODE_ENV=production.");
if (
  !origin ||
  !state ||
  !path.isAbsolute(state) ||
  !Number.isInteger(port) ||
  port < 1024 ||
  port > 65535
)
  throw Error(
    "Configure the exact origin, private state directory and dedicated port.",
  );
const relative = path.relative(root, state);
if (
  relative === "" ||
  (!relative.startsWith(".." + path.sep) && !path.isAbsolute(relative))
)
  throw Error("Workspace state must stay outside the release checkout.");
if (!development && new URL(origin).protocol !== "https:")
  throw Error("Hosted access requires HTTPS.");
process.umask(0o077);
mkdirSync(state, { recursive: true, mode: 0o700 });
process.env.CONTENT_ORIGINAL_WORKSPACE = "1";
process.env.OUTPUTS_PATH = path.join(state, "outputs");
// Reuse only the existing private model/voice endpoints, never another app's
// origin, account store, listener, invitations or service identity.
if (process.env.CONTENT_ENGINE_PRIVATE_VOICE_CONFIG) {
  const allowed = new Set([
    "SPARK_LLM_URL",
    "SPARK_LLM_MODEL",
    "SPARK_LLM_TOKEN",
    "SPARK_TTS_URL",
    "SPARK_TTS_TOKEN",
  ]);
  for (const line of readFileSync(
    process.env.CONTENT_ENGINE_PRIVATE_VOICE_CONFIG,
    "utf8",
  ).split(/\r?\n/)) {
    const index = line.indexOf("=");
    if (index < 1) continue;
    const key = line.slice(0, index).trim();
    if (!allowed.has(key)) continue;
    let value = line.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    )
      value = value.slice(1, -1);
    process.env[key] = value;
  }
}
const app = next({
  dev: development,
  dir: path.join(root, "apps/web"),
  hostname: new URL(origin).hostname,
  port,
});
await app.prepare();
const server = createOriginalAppGateway({
  origin,
  hosted: !development,
  development,
  nextHandler: app.getRequestHandler(),
  engine,
  root: path.join(root, "demo/public"),
  storePath: path.join(state, "workspaces.json"),
  registrationInvites: (process.env.WORKSPACE_INVITE_HASHES || "")
    .split(",")
    .filter(Boolean),
});
server.listen(port, "127.0.0.1", () =>
  console.log(
    "Original Content workspace listening on its private loopback port.",
  ),
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () =>
    server.close(() => void app.close().then(() => process.exit(0))),
  );
