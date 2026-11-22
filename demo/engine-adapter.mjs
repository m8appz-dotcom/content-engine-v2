import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync } from "node:fs";
import { execute, inputError } from "./process.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export default {
  name: "Content Engine",
  actions: ["plan"],
  status: async () => ({
    available: true,
    capabilities: [
      "Evidence mapping",
      "Production planning",
      "Storyboard timeline",
    ],
    liveGeneration: false,
  }),
  async run(action, data, { directory, id }) {
    if (
      typeof data.script !== "string" ||
      data.script.trim().length < 50 ||
      data.script.length > 20000
    )
      throw inputError(
        "Write a script of at least 50 characters before creating a storyboard.",
      );
    if (
      typeof data.claim !== "string" ||
      !data.claim.trim() ||
      data.claim.length > 1000
    )
      throw inputError("Choose a claim to map to the source.");
    const result = await execute(
      process.execPath,
      ["--import", "tsx", path.join(root, "demo/engine-runner.ts")],
      { ...data, id },
      { cwd: root },
    );
    const target = path.join(directory, "storyboard.json");
    writeFileSync(target, JSON.stringify(result, null, 2));
    return {
      result,
      files: [
        { name: "storyboard.json", path: target, mime: "application/json" },
      ],
    };
  },
};
