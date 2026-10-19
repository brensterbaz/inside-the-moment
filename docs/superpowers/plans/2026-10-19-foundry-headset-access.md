# Foundry Headset Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Let the user's Quest open the current Foundry Local replay over Wi-Fi using a temporary HTTPS URL, without paid services or a permanent public model endpoint.

**Architecture:** Build a dedicated static frontend with local analysis enabled. A loopback-only gateway serves that build, requires an expiring access code/session and forwards only the two known analysis endpoints to the existing loopback API. Cloudflare Quick Tunnel supplies a temporary trusted HTTPS origin; the gateway remains authenticated even if its URL is discovered. The native runtime and Vercel deployment remain separate.

**Tech Stack:** Node HTTP and crypto, existing TypeScript/Vitest/Playwright, Vite, free accountless `cloudflared` Quick Tunnel.

---

Execute inline on the clean Foundry feature branch under the user's request to see this version in the headset. The execution sub-skills are unavailable. No delegation, paid provisioning, permanent hosting, merge or hackathon submission.

## Task 1: Establish the transport

- [x] Verify the native API is ready at `http://127.0.0.1:5175/api/analysis/health`.
- [x] Read current official Quick Tunnel documentation and install its free CLI. Use no account, subscription, named tunnel or background service.

## Task 2: Build the bounded gateway

Files: `server/headset.ts`, `scripts/build-headset.mjs`, `package.json`, `tests/headset.test.ts`.

- [x] Add an HTTP contract test: unauthenticated assets/API must return 401; valid same-origin login sets a Secure, HttpOnly, SameSite cookie; unknown paths remain 404; foreign origins and oversized requests are rejected; session expiry and failed-code throttling apply.
- [x] Implement `createHeadsetServer({ assets, code, token, now, expiresAt, upstream })`, returning a Node HTTP server without loading the native SDK. Use exact manifest paths, constant-time code/token comparison, a four-hour lifetime, eight failed logins per minute, a 2KB request bound and only `/api/analysis` and `/api/analysis/health` as upstream paths. Rewrite upstream Host/Origin to the existing local API contract only after authentication and same-origin checks.
- [x] Build the frontend with `VITE_FOUNDRY_LOCAL=1` into ignored `.foundry/headset-build` using the existing Vite binary; keep the ordinary `dist` build and static fallback independent. Serve only manifest files, never workspace source, caches or credentials.
- [x] Add `build:headset` and `headset:serve` scripts. At CLI startup, write the generated access code/session expiry to ignored `.foundry/headset-session.json` with mode 0600; print the code for the user. Bind gateway port 5176 to 127.0.0.1.

## Task 3: Start and verify the actual link

- [x] Run `npm test`, `npm run build` and `npm run build:headset`; inspect results.
- [x] Start `npm run headset:serve`, then `cloudflared tunnel --url http://127.0.0.1:5176 --no-autoupdate`. Record its current HTTPS URL in ignored session evidence.
- [x] Verify unauthenticated access is blocked through HTTPS. Sign in with Playwright, verify a secure browser context, open Menu and obtain a real validated native response. Check asset/source isolation and invalid-origin/oversized failures through the gateway.
- [x] Document restart/stop instructions, the temporary external HTTPS relay, Mac-awake dependency and hardware testing still pending. Update the existing draft PR with tested final scope; deliver the current URL and access code to the user. Never infer successful physical headset entry from a desktop check.
