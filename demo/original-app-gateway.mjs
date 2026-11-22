import { createHash, randomBytes } from "node:crypto";
import { createDemoServer } from "./server.mjs";

// The original Next application runs on the same server as the existing WebAuthn
// authority. No alternate listener or browser-supplied identity is trusted.
export function createOriginalAppGateway({
  nextHandler,
  engine,
  development = false,
  ...options
}) {
  let authenticated;
  const server = createDemoServer({
    ...options,
    engine: {
      ...engine,
      attach(s, context) {
        authenticated = context.authenticated;
        engine?.attach?.(s, context);
      },
    },
  });
  const previous = server.listeners("request")[0];
  server.removeListener("request", previous);
  const host = new URL(options.origin).host;
  const budgets = new Map();
  let renderActive = false;
  const reply = (res, status, message) => {
    res.writeHead(status, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
    res.end(
      JSON.stringify({
        error: {
          code: status === 401 ? "unauthorized" : "unavailable",
          message,
        },
      }),
    );
  };
  server.on("request", async (req, res) => {
    if (req.headers.host !== host)
      return reply(res, 400, "This address is unavailable.");
    if (req.url === "/") {
      res.writeHead(302, { Location: "/app", "Cache-Control": "no-store" });
      res.end();
      return;
    }
    if (req.url?.startsWith("/workspace/")) {
      req.url = "/" + req.url.slice("/workspace/".length);
      return previous(req, res);
    }
    if (!req.url?.startsWith("/app")) return previous(req, res);
    if (/%2f|%5c|\\|\.\./i.test(req.url))
      return reply(res, 404, "This page is unavailable.");
    const pathname = new URL(req.url, options.origin).pathname;
    if (pathname.includes("%"))
      return reply(res, 404, "This page is unavailable.");
    if (!(pathname === "/app" || pathname.startsWith("/app/")))
      return reply(res, 404, "This page is unavailable.");
    delete req.headers["x-content-account"];
    const session = authenticated(req);
    const api = pathname.startsWith("/app/api/");
    let holdsRender = false;
    if (api) {
      if (!session)
        return reply(res, 401, "Sign in with a passkey to open your projects.");
      const safe =
        /^\/app\/api\/(?:reviewer|jobs(?:\/[a-zA-Z0-9_-]{1,90}(?:\/(?:prepare-example|evidence(?:\/[a-zA-Z0-9_-]{1,90}\/media)?|story-angles|select-angle|scripts|verify-claims|approve-script|request-script-revision|reject-script|production-plan|storyboard-preview|storyboard|approve-storyboard|request-storyboard-revision|render-draft|drafts(?:\/[a-zA-Z0-9_-]{1,90}(?:\/media)?)?|qa|audit-log|deliverable-contract))?)?)$/.test(
          pathname,
        );
      if (!safe || !["GET", "POST"].includes(req.method))
        return reply(res, 404, "This action is unavailable.");
      if (
        req.method === "POST" &&
        (req.headers.origin !== options.origin ||
          !(req.headers["content-type"] || "").startsWith("application/json"))
      )
        return reply(res, 403, "Open this workspace directly and try again.");
      const account = createHash("sha256").update(session.user).digest("hex");
      req.headers["x-content-account"] = account;
      if (req.method === "POST") {
        const now = Date.now();
        for (const [key, value] of budgets)
          if (value.until < now) budgets.delete(key);
        const budget = budgets.get(account) || {
          until: now + 3600000,
          writes: 0,
          jobs: 0,
          renders: 0,
        };
        if (budgets.size >= 16 && !budgets.has(account))
          return reply(
            res,
            429,
            "Workspace capacity is full. Try again later.",
          );
        const render = pathname.endsWith("/render-draft"),
          newJob = pathname === "/app/api/jobs";
        if (
          budget.writes >= 60 ||
          (newJob && budget.jobs >= 4) ||
          (render && (budget.renders >= 3 || renderActive))
        )
          return reply(
            res,
            429,
            "The current run limit has been reached. Try again later.",
          );
        budget.writes++;
        if (newJob) budget.jobs++;
        if (render) budget.renders++;
        budgets.set(account, budget);
        if (render) {
          renderActive = true;
          holdsRender = true;
        }
      }
    }
    const nonce = randomBytes(18).toString("base64");
    const csp = `default-src 'self'; script-src 'self' 'nonce-${nonce}'${development ? " 'unsafe-eval'" : ""}; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'`;
    req.headers["content-security-policy"] = csp;
    req.headers["x-nonce"] = nonce;
    res.setHeader("Content-Security-Policy", csp);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()",
    );
    if (options.hosted)
      res.setHeader("Strict-Transport-Security", "max-age=31536000");
    try {
      await nextHandler(req, res);
    } catch {
      if (!res.headersSent)
        reply(
          res,
          503,
          "The workspace could not finish. Your saved work is still available.",
        );
      else res.end();
    } finally {
      if (holdsRender) renderActive = false;
    }
  });
  return server;
}
