import { afterEach, describe, expect, it, vi } from "vitest";
import type { Server } from "node:http";
import { createHeadsetServer } from "../server/headset";

const servers: Server[] = [];
afterEach(async () => {
  await Promise.all(
    servers.map(
      (server) =>
        new Promise<void>((resolve) => {
          server.closeAllConnections();
          server.close(() => resolve());
        }),
    ),
  );
  servers.length = 0;
});
async function setup() {
  let time = 1000;
  const upstream = vi.fn(
    async (_url: string, _init: { headers: Record<string, string> }) =>
      new Response(JSON.stringify({ provider: "foundry-local" }), {
        headers: { "Content-Type": "application/json" },
      }),
  );
  const server = createHeadsetServer({
    assets: new Map([
      ["/", { body: Buffer.from("<h1>Replay</h1>"), type: "text/html" }],
      [
        "/assets/app.js",
        { body: Buffer.from("app()"), type: "text/javascript" },
      ],
    ]),
    code: "12345678",
    token: "a".repeat(64),
    now: () => time,
    expiresAt: 10_000,
    upstream,
  });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as { port: number };
  const base = `http://127.0.0.1:${address.port}`;
  const login = (code = "12345678", origin = base) =>
    fetch(`${base}/unlock`, {
      method: "POST",
      headers: {
        Origin: origin,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ code }),
      redirect: "manual",
    });
  return {
    base,
    login,
    upstream,
    advance: () => {
      time = 11_000;
    },
  };
}
describe("temporary headset gateway", () => {
  it("requires authentication for the build and native API, then sets a private session cookie", async () => {
    const { base, login, upstream } = await setup();
    for (const path of ["/", "/assets/app.js", "/api/analysis/health"])
      expect((await fetch(base + path)).status).toBe(401);
    expect(upstream).not.toHaveBeenCalled();
    const response = await login();
    expect(response.status).toBe(303);
    const cookie = response.headers.get("set-cookie")!;
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Strict");
    expect(
      await fetch(base, { headers: { Cookie: cookie.split(";")[0] } }).then(
        (r) => r.text(),
      ),
    ).toContain("Replay");
    expect(
      (await fetch(base, { headers: { Cookie: "itm_headset=forged" } })).status,
    ).toBe(401);
  });
  it("rejects foreign login/API origins and never proxies before authentication", async () => {
    const { base, login, upstream } = await setup();
    for (const origin of ["https://other.example", "null"]) {
      expect((await login("12345678", origin)).status).toBe(403);
    }
    const cookie = (await login()).headers.get("set-cookie")!.split(";")[0];
    const response = await fetch(base + "/api/analysis", {
      method: "POST",
      headers: {
        Cookie: cookie,
        Origin: "https://other.example",
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    expect(response.status).toBe(403);
    expect(upstream).not.toHaveBeenCalled();
  });
  it("exposes only manifest assets and known bounded analysis paths", async () => {
    const { base, login, upstream } = await setup();
    const cookie = (await login()).headers.get("set-cookie")!.split(";")[0];
    for (const path of [
      "/.env.local",
      "/src/main.ts",
      "/docs/source/SHARED_CHAT.md",
      "/api/other",
      "/%2e%2e/README.md",
    ])
      expect(
        (await fetch(base + path, { headers: { Cookie: cookie } })).status,
      ).toBe(404);
    const headers = {
      Cookie: cookie,
      Origin: base,
      "Content-Type": "application/json",
    };
    expect(
      (
        await fetch(base + "/api/analysis", {
          method: "POST",
          headers,
          body: "x".repeat(2049),
        })
      ).status,
    ).toBe(413);
    expect(upstream).not.toHaveBeenCalled();
    const response = await fetch(base + "/api/analysis", {
      method: "POST",
      headers,
      body: "{}",
    });
    expect(response.status).toBe(200);
    expect(upstream.mock.calls[0][0]).toBe(
      "http://127.0.0.1:5175/api/analysis",
    );
    expect(upstream.mock.calls[0][1].headers.Origin).toBe(
      "http://127.0.0.1:5174",
    );
  });
  it("throttles failed codes and expires an existing session", async () => {
    const { base, login, advance } = await setup();
    const cookie = (await login()).headers.get("set-cookie")!.split(";")[0];
    for (let i = 0; i < 8; i++)
      expect((await login("00000000")).status).toBe(401);
    expect((await login()).status).toBe(429);
    advance();
    expect((await fetch(base, { headers: { Cookie: cookie } })).status).toBe(
      410,
    );
  });
});
