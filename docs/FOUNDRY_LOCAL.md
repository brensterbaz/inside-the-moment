# Foundry Local analyst

The desktop development build can use a real model through Microsoft Foundry Local on the Mac. This is local inference with no Azure subscription, provider API key or per-token bill. The public Vercel test site remains the previously deployed scripted build; this change does not deploy a backend or expose the Mac to the internet.

## Run

```sh
npm ci
npm run dev:foundry
```

Open **http://127.0.0.1:5174/**, then **Menu**. Wait for **Foundry Local ready**, leave **Use local AI** checked and choose a question or **Generate explanation**. Settings contains the independent Fan/Analyst and EN/ES controls. The replay pauses for an explicit analysis request; timeline, selection and movement controls remain available while it works.

The launcher runs a Node API on `127.0.0.1:5175` and the Vite app on `127.0.0.1:5174`. Stop it with Ctrl+C. The API is bound to loopback and cannot be reached by another device.

The first start downloads roughly **1.8GB** of model files. Downloads, model logs and runtime data live under ignored `.foundry/`; they are never committed or included in `dist/`. Internet access is needed for installation, catalogue access and model acquisition. Generation runs locally. The SDK's non-essential telemetry setting is disabled; the SDK documents that a minimal process-information event may remain.

`npm run dev` and `npm run preview` retain the scripted experience without starting a model. The static production build disables the local AI toggle. It does not try to contact a judge's localhost or ship native model code to a headset.

## Model and explanation contract

- SDK: `foundry-local-sdk` **2.1.0**, pinned in the dependency lockfile.
- Model variant: **`qwen2.5-1.5b-instruct-generic-cpu:4`**, pinned in `server/foundry.ts`.
- Native API: `ChatSession`, `Request` and `Item`; no cloud API is called.
- Maximum output: 128 tokens per selection. Native generation is cancelled after 45 seconds; the browser also has a 50-second deadline.

The model **curates verified statements**. It does not write the displayed football facts freely. The API reconstructs statements from the authored events, trajectories and calculated metrics, asks the model to select relevant statement IDs, validates those IDs, adds required measurements/limitations and renders the statements in their recorded order. Arbitrary narrative, invented IDs and extra fields are rejected. The source label is **AI-CURATED · LOCAL** only after a successful real model response; failure shows the labelled scripted explanation.

This boundary is deliberate: initial free-prose checks exposed incorrect player/role assignments even when numbers and citation IDs were valid. Checking JSON shape and numeric values alone did not prevent those errors. Fixed factual wording with model selection prevents that class of generated claim from appearing in the displayed answer. It remains a limited local analyst, not an unrestricted football chatbot or a completed Azure-based competition entry.

Fan mode produces two selected statements for the existing questions. Analyst mode includes at least three, preserving the recorded metric and its relevant interpretation/limitation. Recap statements are rebuilt from recovery, pass, run and goal events; their links use the exact event timestamps. Analyst recap pass statements add derived pass distance and duration. English and Spanish statements preserve identities and numbers.

## Replay behaviour

- A completed playback triggers one full-sequence recap. Rewinding below the end rearms it for another playback. Paused end frames do not cause repeated model calls.
- There is no inference in the render loop or XR state getter. Desktop and XR read the same stored explanation and source label.
- Seeking, selecting another player, changing topic/preferences or resuming playback invalidates a pending result. Responses from an older context are ignored even if their transport fails to honour cancellation.
- Results are cached in the local server by match-data version, topic, detail, language, selected player and replay timestamp. The cache holds at most 128 contexts and clears when the server restarts.
- One native generation runs at a time. A competing request receives a useful busy response; model/setup failure preserves the scripted fallback.

## Verification commands

Normal tests use a fake provider and never download weights or run native inference:

```sh
npm test
npm run build
```

With the local server ready, explicitly run real inference checks:

```sh
npm run foundry:smoke
```

This exercises the two audiences and languages, the decisive pass, recaps and another selected player. It writes the actual responses, model ID and timings to ignored `output/foundry-smoke.json`. A cache hit is recorded as cached, not counted as a new generation. Inspect those outputs against the source records as well as checking HTTP success.

The API also rejects unknown players/times/preferences, extra request fields, bodies over 2KB, foreign origins and unrecognised hosts before generation. It accepts only the local replay's known request shape. No arbitrary prompt, model URL or credential can be supplied by a browser request.

## Verified on 19 October 2026

- `npm test`: **17 tests passed**, including evidence validation, altered records, cache boundaries, overlapping requests, provider failure, stale results and recap rearming.
- `npm run build`: TypeScript and the static production build passed. The existing Three.js bundle size warning remains. Native SDK/server imports were absent from the browser bundle.
- `npm run foundry:smoke`: **8/8 real native requests passed**, all fresh rather than cached, on the development Apple M5 Mac. Recorded model generation times were **1,457–2,263ms**; this is a local observation, not a performance guarantee for another machine.
- Chrome desktop: real generation, EN/ES, Fan/Analyst, selected-player analysis, timestamp links, seek during generation, scripted toggle and recovery after an injected HTTP 503 were exercised. The failure check used a browser intercept; the successful responses used the real local runtime.
- Completing playback from 29.5s generated exactly **one** recap request; the answer included recorded recovery, assist and goal links. Movement preview/confirmation and undo after the fade also worked.
- At **390 × 844**, controls and the scrollable answer panel were inspected with no horizontal page overflow. Screenshots are local, ignored files in `output/playwright/`.
- The static production preview disabled local AI, retained working scripted questions and made **zero analysis API requests**. This does not constitute a new public deployment or Quest hardware test.

## Deployment and hardware boundary

This implementation is for the development Mac. Neither the native SDK nor model weights belong in the static frontend bundle. A Quest viewing the existing public test site cannot use this loopback API. Serving the model to a headset or judges would require a separately tested secure connection and an authorised hosting/access decision. Actual Quest performance, controller comfort and headset AI use remain untested.

The installed native SDK emits an upstream Objective-C warning about a duplicate `MATStreamingSessionDelegate` class on this Mac. Treat any native crash as a runtime failure and keep the scripted fallback; do not suppress errors or claim that the warning has been fixed in application code.

## References

- [Foundry Local overview](https://learn.microsoft.com/en-us/azure/foundry-local/what-is-foundry-local)
- [SDK reference](https://learn.microsoft.com/en-us/azure/foundry-local/reference/reference-sdk-current)
- [Microsoft Foundry Local repository](https://github.com/microsoft/Foundry-Local)
