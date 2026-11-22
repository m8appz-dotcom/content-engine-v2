import { loadWorkspaceStore, workspaceStorageLimits } from "./server.mjs";
import { fileURLToPath } from "node:url";
import path from "node:path";

export function preflightStore(storePath, memoryMiB) {
  if (
    !path.isAbsolute(storePath) ||
    !Number.isFinite(memoryMiB) ||
    memoryMiB <= 0
  )
    throw Error(
      "Supply an absolute private store path and the unit memory budget.",
    );
  const { database, legacy } = loadWorkspaceStore(storePath);
  const bytes = Buffer.byteLength(
    JSON.stringify(
      legacy ? { ...database, legacyAdmission: legacy } : database,
    ),
  );
  const limit = legacy
    ? workspaceStorageLimits.recoveryStoreBytes
    : workspaceStorageLimits.storeBytes;
  const rssMiB = process.resourceUsage().maxRSS / 1024;
  if (bytes > limit || rssMiB >= memoryMiB * 0.8)
    throw Error(
      "Offline migration is required before changing the running release.",
    );
  return { bytes, limit, rssMiB, legacyRecovery: Boolean(legacy) };
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    console.log(
      JSON.stringify(preflightStore(process.argv[2], Number(process.argv[3]))),
    );
  } catch {
    console.error(
      "Store preflight failed. Keep the current release running and migrate the original store offline with its backup.",
    );
    process.exitCode = 1;
  }
}
