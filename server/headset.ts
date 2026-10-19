import { createServer } from "node:http";
import { randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

type Asset = { body: Buffer; type: string };
type Upstream = (
  url: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body?: string;
    signal: AbortSignal;
  },
) => Promise<Response>;
type Options = {
  assets: Map<string, Asset>;
  code: string;
  token: string;
  expiresAt: number;
  now?: () => number;
  upstream?: Upstream;
};
const loginPage = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Inside the Moment · Headset access</title><style>html{color-scheme:dark;font:18px system-ui;background:#0c171d;color:#e4ede9}body{max-width:400px;margin:12vh auto;padding:24px}h1{font-size:36px;letter-spacing:-1px}p{line-height:1.6;color:#b6c8c3}label{display:block;margin:28px 0 10px}input,button{box-sizing:border-box;width:100%;min-height:54px;padding:12px;border:1px solid #52675d;border-radius:12px;font:inherit}input{letter-spacing:5px;background:#15292d}button{margin-top:16px;background:#c6f58b;color:#152012;font-weight:700;cursor:pointer}small{display:block;margin-top:24px;color:#99ada6}</style><body><p>FOOTBALL, FROM WITHIN.</p><h1>Inside the Moment</h1><p>Enter your access code to open this headset session.</p><form action="/unlock" method="post"><label for="code">Access code</label><input id="code" name="code" type="password" inputmode="numeric" pattern="[0-9]{8}" minlength="8" maxlength="8" autocomplete="one-time-code" required><button>Open the replay</button></form><small>This temporary session requires the Mac to stay awake.</small></body></html>`;

function matches(actual: string, expected: string) {
  const a = Buffer.from(actual),
    b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** The tunnel can reach only an authenticated static build and two bounded API routes. */
export function createHeadsetServer({
  assets,
  code,
  token,
  expiresAt,
  now = Date.now,
  upstream = (url, init) => globalThis.fetch(url, init),
}: Options) {
  let failedLogins = 0,
    loginWindow = now();
  const server = createServer(async (request, response) => {
    const send = (
      status: number,
      body: string | Buffer,
      type = "text/plain; charset=utf-8",
      headers: Record<string, string> = {},
    ) => {
      if (response.destroyed) return;
      response.writeHead(status, {
        "Content-Type": type,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        // Preserve Origin on the login form's same-origin POST.
        "Referrer-Policy": "same-origin",
        "X-Robots-Tag": "noindex, nofollow",
        "Permissions-Policy": "xr-spatial-tracking=(self)",
        "Content-Security-Policy":
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
        ...headers,
      });
      response.end(request.method === "HEAD" ? undefined : body);
    };
    const host = request.headers.host ?? "";
    const local = /^(127\.0\.0\.1|localhost):\d+$/.test(host);
    if (!local && !/^[a-z0-9-]+\.trycloudflare\.com$/.test(host)) {
      send(403, "Unknown headset host.");
      return;
    }
    const origin = `${local ? "http" : "https"}://${host}`;
    if (now() >= expiresAt) {
      send(
        410,
        "This headset session has expired. Start a new session on the Mac.",
      );
      return;
    }
    if (
      (request.method === "POST" && request.headers.origin !== origin) ||
      (request.headers.origin && request.headers.origin !== origin)
    ) {
      send(403, "Use this headset session's own page.");
      return;
    }
    let path: string;
    try {
      path = decodeURIComponent(new URL(request.url ?? "/", origin).pathname);
    } catch {
      send(400, "Invalid path.");
      return;
    }
    const readBody = async () => {
      let body = "",
        size = 0;
      for await (const chunk of request) {
        size += Buffer.byteLength(chunk);
        if (size > 2048) throw new Error("TOO_LARGE");
        body += chunk;
      }
      return body;
    };
    try {
      if (path === "/unlock" && request.method === "POST") {
        if (now() - loginWindow >= 60_000) {
          failedLogins = 0;
          loginWindow = now();
        }
        if (failedLogins >= 8) {
          send(429, "Too many incorrect codes. Wait one minute.", undefined, {
            "Retry-After": "60",
          });
          return;
        }
        if (
          !request.headers["content-type"]?.startsWith(
            "application/x-www-form-urlencoded",
          )
        ) {
          send(415, "Use the access form.");
          return;
        }
        const supplied =
          new URLSearchParams(await readBody()).get("code") ?? "";
        if (!matches(supplied, code)) {
          failedLogins++;
          send(401, loginPage, "text/html; charset=utf-8");
          return;
        }
        send(303, "", undefined, {
          Location: "/",
          "Set-Cookie": `itm_headset=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${Math.max(1, Math.floor((expiresAt - now()) / 1000))}`,
        });
        return;
      }
      const cookie =
        request.headers.cookie
          ?.split(";")
          .map((c) => c.trim())
          .find((c) => c.startsWith("itm_headset="))
          ?.slice("itm_headset=".length) ?? "";
      if (!matches(cookie, token)) {
        const html =
          (request.method === "GET" || request.method === "HEAD") &&
          !path.startsWith("/api/");
        send(
          401,
          html
            ? loginPage
            : JSON.stringify({ error: "Unlock this headset session first." }),
          html ? "text/html; charset=utf-8" : "application/json",
        );
        return;
      }
      if (
        (path === "/api/analysis" && request.method === "POST") ||
        (path === "/api/analysis/health" && request.method === "GET")
      ) {
        if (
          request.method === "POST" &&
          !request.headers["content-type"]?.startsWith("application/json")
        ) {
          send(
            415,
            JSON.stringify({ error: "JSON required." }),
            "application/json",
          );
          return;
        }
        const body = request.method === "POST" ? await readBody() : undefined;
        const controller = new AbortController();
        response.on("close", () => {
          if (!response.writableEnded) controller.abort();
        });
        try {
          const remote = await upstream(`http://127.0.0.1:5175${path}`, {
            method: request.method!,
            headers: {
              Origin: "http://127.0.0.1:5174",
              "Content-Type": "application/json",
            },
            body,
            signal: AbortSignal.any([
              controller.signal,
              AbortSignal.timeout(50_000),
            ]),
          });
          send(
            remote.status,
            Buffer.from(await remote.arrayBuffer()),
            "application/json",
          );
        } catch {
          send(
            503,
            JSON.stringify({
              error:
                "The Mac's local analyst is unavailable. Scripted explanations remain available.",
            }),
            "application/json",
          );
        }
        return;
      }
      const asset = assets.get(path);
      if (asset && (request.method === "GET" || request.method === "HEAD"))
        send(200, asset.body, asset.type);
      else send(404, "Not found.");
    } catch (error) {
      const large = error instanceof Error && error.message === "TOO_LARGE";
      send(
        large ? 413 : 400,
        JSON.stringify({
          error: large
            ? "Request is too large."
            : "Unable to read this request.",
        }),
        "application/json",
      );
    }
  });
  server.requestTimeout = 10_000;
  server.headersTimeout = 10_000;
  return server;
}

async function loadAssets(root: string) {
  const types: Record<string, string> = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript",
    ".css": "text/css",
    ".svg": "image/svg+xml",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".txt": "text/plain; charset=utf-8",
  };
  const assets = new Map<string, Asset>();
  async function walk(directory: string, prefix = "") {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      const name = `${prefix}/${entry.name}`;
      if (entry.isDirectory()) await walk(join(directory, entry.name), name);
      else if (entry.isFile())
        assets.set(name, {
          body: await readFile(join(directory, entry.name)),
          type: types[extname(entry.name)] ?? "application/octet-stream",
        });
    }
  }
  await walk(root);
  if (!assets.has("/index.html"))
    throw new Error("Run npm run build:headset first.");
  assets.set("/", assets.get("/index.html")!);
  return assets;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const code = String(randomInt(10_000_000, 100_000_000));
  const expiresAt = Date.now() + 4 * 60 * 60 * 1000;
  const assets = await loadAssets(resolve(".foundry/headset-build"));
  const server = createHeadsetServer({
    assets,
    code,
    token: randomBytes(32).toString("hex"),
    expiresAt,
  });
  await mkdir(".foundry", { recursive: true });
  await writeFile(
    ".foundry/headset-session.json",
    JSON.stringify({ code, expiresAt: new Date(expiresAt).toISOString() }),
    { mode: 0o600 },
  );
  server.listen(5176, "127.0.0.1", () =>
    console.log(
      `Headset gateway: http://127.0.0.1:5176\nAccess code: ${code}\nExpires: ${new Date(expiresAt).toISOString()}\nStart the HTTPS relay: cloudflared tunnel --url http://127.0.0.1:5176 --no-autoupdate`,
    ),
  );
  server.on("error", (error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
  const close = () => {
    server.closeAllConnections();
    server.close();
  };
  process.once("SIGINT", close);
  process.once("SIGTERM", close);
}
