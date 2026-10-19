# Foundry Local Analyst Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Run genuine Microsoft Foundry Local inference on the existing Mac and connect evidence-grounded explanations and automatic recaps to the desktop replay and shared XR result state without cloud billing.

**Architecture:** A loopback-only Node API rebuilds evidence from the authored match, calls the native Foundry Local SDK, validates the output and attaches recorded metrics/citations. Vite proxies the local API; the static hosted app continues to use its labelled scripted fallback. Requests are explicit, cached by evidence context and discarded when selection/time/preferences change.

**Tech Stack:** Existing TypeScript, Vite, Three.js and Vitest; Microsoft `foundry-local-sdk`, Node.js 22 and `tsx`; Playwright browser verification.

---

The execution sub-skills are not installed. Execute inline on the clean `feat/foundry-local-analyst` branch under the user's instruction to develop with Foundry. No delegation, paid service, cloud deployment or hackathon submission is part of this milestone.

**Implementation decision:** real free-prose trials produced incorrect player-role assignments despite valid JSON and numeric checks. The implemented contract therefore uses native model selection of verified fact IDs, with application-rendered wording, mandatory measurements/limitations and exact citations. The UI explicitly calls this AI curation. The initial Phi GPU variant was too slow here; the pinned Qwen CPU variant passed the recorded checks. See `docs/FOUNDRY_LOCAL.md` for evidence and limits.

## Files and responsibilities

| File | Responsibility |
| --- | --- |
| `server/foundry.ts` | Native model lifecycle and bounded generation; server-only SDK import. |
| `server/index.ts` | Loopback HTTP API, JSON/body/origin limits, health and graceful shutdown. |
| `src/analysis-contract.ts` | Runtime request validation and typed result provenance. |
| `src/analysis-context.ts` | Pure evidence, metrics and citation construction from existing records. |
| `server/analysis.ts` | Prompt construction, output validation and context cache. |
| `src/analysis-client.ts` | Browser request lifecycle and stale-response protection. |
| `src/main.ts`, `src/xr.ts`, `src/style.css` | Shared explanation state, accurate provenance, request controls and automatic recap. |
| `scripts/dev-foundry.mjs`, `scripts/foundry-smoke.ts` | Reproducible local startup and opt-in real-model verification. |
| `tests/analysis.test.ts`, `tests/analysis-client.test.ts` | Contract, grounding, failure and race tests using a fake transport. |
| `docs/FOUNDRY_LOCAL.md`, status docs | Setup, selected model, real verification evidence and deployment limitations. |

## Task 1: Discover and verify the local runtime

- [x] Install pinned SDK and runner versions after inspecting the official npm package metadata:

```sh
npm view foundry-local-sdk version engines --json
npm install --save-dev --save-exact foundry-local-sdk@2.1.0 tsx
```

- [x] Inspect the installed package declarations rather than assume older documentation matches SDK v2. List the native catalog; select a small multilingual instruct model supported by the Mac. Keep downloaded weights outside Git.
- [x] Download/load that model and obtain an actual inference response. Record its model ID, runtime version and observed latency. A mocked response cannot complete this task.

## Task 2: Evidence contract and local API

- [x] Add invalid-request tests before the provider is connected:

```ts
expect(() => parseAnalysisRequest({ topic: 'space', detail: 'fan', language: 'en', selected: 'unknown', time: 23 })).toThrow();
expect(() => parseAnalysisRequest({ topic: 'space', detail: 'fan', language: 'en', selected: 'h9', time: Number.NaN })).toThrow();
```

- [x] Build evidence with the existing match records and replay calculations. Keep current-time player analysis distinct from the featured pass/run; a recap explicitly covers the full 30 seconds. Metrics are computed by the app, never supplied by the model.
- [x] Validate generated text/citation selections against supplied evidence. Reject unknown IDs, malformed output, unsupported numeric claims and provider failure. Retain a labelled scripted fallback on rejection. Test grounded output against altered evidence and both languages; schema validity alone is not factual verification.
- [x] Expose only `GET /api/analysis/health` and `POST /api/analysis` on `127.0.0.1:5175`. Accept the known request shape, bound body and generation sizes, serialize native requests and return useful unavailable/busy/failure states without logging private environment variables.
- [x] Add a Vite proxy and a combined development launcher. No paid endpoint, key or Azure subscription is required.

## Task 3: Desktop and XR result lifecycle

- [x] Add a local AI request control with loading/error/provenance states and retain the scripted option. Never claim a model is connected before a successful real response.
- [x] Store one explanation result shared by the desktop card and XR panel. Never invoke native inference from the animation loop or XR state getter.
- [x] Cancel/ignore stale responses after seek, player, mode, language or topic changes. Cache by complete evidence context; explicit question or preference changes trigger requests, not every replay tick.
- [x] Generate one automatic recap on reaching the end of each playback. Rewinding and completing a new playback can trigger another; paused end-state frames cannot repeatedly trigger it.
- [x] Keep movement preview/confirm/fade/undo, selection, timeline and deterministic replay behaviour unchanged by analysis latency or failure.

## Task 4: Verify and deliver

- [x] Run the bounded automated suite and production build:

```sh
npm test
npm run build
```

- [x] Run the real-model smoke checks for fan/analyst, English/Spanish and recap; inspect statements and evidence against the authored records. Record observed limits honestly.
- [x] Start `npm run dev:foundry`. Use Playwright to exercise real analysis, citations, settings, seek during pending analysis, fallback and automatic recap. Save screenshots under ignored `output/playwright/`.
- [x] Verify the static production bundle excludes the native SDK/server and still has a usable scripted fallback when the local backend is absent.
- [x] Update project documentation to distinguish genuine local AI, Azure cloud still disconnected, hosted static demo unchanged and Quest hardware still untested.
- [x] Commit the focused work and publish a reviewable branch/PR after tests and checks pass. Do not merge or redeploy the public app in this milestone. Delivered as [draft PR #1](https://github.com/brensterbaz/inside-the-moment/pull/1).
