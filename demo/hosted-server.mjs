// Keep the original entry point and unit binding for reversible upgrades.
if (process.env.CONTENT_ORIGINAL_WORKSPACE === "1") {
  await import("./original-app-server.mjs");
} else {
  await import("./hosted-saved-server.mjs");
}
