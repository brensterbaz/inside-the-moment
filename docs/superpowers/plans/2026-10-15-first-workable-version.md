# First Workable Version Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Deliver a usable local desktop football replay with deterministic data, time controls, viewpoint preview/confirmation, evidence-based local analysis, and a WebXR entry path.

**Architecture:** A Vite/TypeScript application separates the authored match and pure replay calculations from Three.js rendering and interface state. One replay clock drives every moving object and derived metric. A deterministic analyst adapter and command parser run locally and are explicitly labelled as scripted; cloud integration remains disconnected.

**Tech Stack:** TypeScript, Vite, Three.js, Vitest; no backend, account, paid service or external asset API.

The referenced execution sub-skills are not installed. Execute this bounded plan inline under the user's instruction to build; no delegation, publishing or spending is needed. The workspace has no Git repository or existing application, so work directly in the requested folder and preserve the imported documents.

## Files and boundaries

| File | Responsibility |
| --- | --- |
| `package.json`, `tsconfig.json`, `index.html` | Reproducible dev/build/test commands and app entry. |
| `src/match.ts` | Original players, authored trajectories, timestamped events and ball segments. |
| `src/replay.ts` | Pure sampling, clock, pass/speed/space metrics and command parsing. |
| `src/analyst.ts` | Local evidence-grounded answers and recap in fan/analyst modes; English/Spanish copy. |
| `src/stadium.ts` | Original geometry, lighting, players, ball, selection, trails, orbit controls and viewpoint transitions. |
| `src/xr.ts` | VR session lifecycle, controller rays, world-space controls and teleport confirmation. |
| `src/main.ts`, `src/style.css` | Accessible responsive replay desk, mini-pitch, command entry, help and status. |
| `tests/replay.test.ts` | Replay determinism, event rollback, possession, ball continuity, speed and command boundaries. |
| `docs/LOCAL_BUILD.md` | Controls, architecture, test results and honest headset/cloud limitations. |

## Task 1 — foundation and data

- [x] Create the package and TypeScript configuration with `dev`, `build`, `preview`, `test` scripts.
- [x] Author one 30-second attack, 22 fictional players, an event stream, connected ball segments and pitch-bounded trajectories.
- [x] Add meaningful tests before relying on scene output. Example contracts:

```ts
expect(sampleMatch(20)).toEqual(sampleMatch(20));
expect(sampleMatch(12).events.every(event => event.time <= 12)).toBe(true);
expect(sampleMatch(30).score).toEqual([2, 1]);
expect(sampleMatch(0).score).toEqual([1, 1]);
expect(parseCommand('back three seconds')).toEqual({ type: 'seek-relative', seconds: -3 });
```

- [x] Run `npm test`; fix data discontinuities and rollback errors before integrating rendering.

## Task 2 — usable replay and analysis

- [x] Build the original stadium scene with visible pitch markings, goals, stands, players and ball; use instancing for repeated geometry and cap pixel ratio.
- [x] Connect play/pause, seek, speed, event navigation, view presets, free orbit, selection and an interactive mini-pitch.
- [x] Preview movement with a marker; confirm/cancel, undo and return to seat must all work.
- [x] Connect local contextual analysis and supported typed commands. Show event/time evidence and derived metrics. Unsupported commands must report their limitation rather than pretend to execute.
- [x] Keep fan/analyst detail and English/Spanish explanation settings independent; label output as scripted.

## Task 3 — WebXR path

- [x] Feature-detect immersive VR and show an explanatory desktop status when unavailable.
- [x] Use `renderer.xr.enabled = true` and `renderer.setAnimationLoop(...)` with the same authoritative replay clock.
- [x] Add controller selection, world-space playback/analysis buttons, timeline seeking and two-step teleport confirmation with a fade.
- [x] Restore the desktop camera and controls after XR session end. State actual-headset testing as pending until physically performed.

## Task 4 — verification and handoff

- [x] Run `npm test` and `npm run build` (TypeScript check plus production bundle).
- [x] Start `npm run dev -- --host 127.0.0.1`; open it in the Codex in-app browser.
- [x] Exercise pause/rewind, event seeks, selection, explanations, mode/language switching, preview/confirm/cancel/undo and keyboard controls.
- [x] Inspect a normal desktop viewport and a narrow layout; check browser errors and readable scene composition.
- [x] Update README/AGENTS/status documentation to distinguish implemented desktop behaviour, WebXR code, untested hardware and disconnected cloud services. Leave a working local preview available.

## Scope checkpoint

This first version implements the local simulation and a labelled analysis adapter. It does not claim real AI, voice recognition, Quest hardware verification, production hosting or competition readiness. No code or art from an existing project is reused; third-party runtime dependencies remain licensed packages.

## Execution record

Completed the bounded local build and browser verification on 15 October 2026. See `docs/LOCAL_BUILD.md` for evidence and hardware limitations. Also added `vite.config.ts` for loopback-only fixed ports, locally bundled fonts, and third-party notices/licenses. No commits were created because this workspace is not a Git repository. The final production build and six replay tests passed. Actual Quest 2 verification remains pending and is not represented by these completed implementation tasks.
