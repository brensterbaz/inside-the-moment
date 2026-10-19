# First playable — v0.1

**19 October update:** the desktop development build now supports genuine Foundry Local inference to curate verified match statements. Run `npm run dev:foundry`; see [setup, model contract and verification](FOUNDRY_LOCAL.md). Cloud AI and speech remain disconnected, the existing HTTPS site remains scripted, and Quest hardware testing is pending. The original 15 October build record below describes the scripted foundation.

Built locally on **15 October 2026**. This is an original, interactive replay prototype with a deterministic local analysis adapter. It is not a connected AI service or a finished hackathon submission.

An HTTPS test deployment is now available at **https://inside-the-moment.vercel.app/**. See [deployment and Quest instructions](DEPLOYMENT.md). Physical headset verification is still pending.

## Run

Requires Node.js 22.22 or newer. From the workspace:

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:5174/**. The server binds only to this computer and uses a strict port. If another copy is running, use that instance or stop it before starting again.

```sh
npm test
npm run build
npm run preview
```

The production preview uses **http://127.0.0.1:4174/**. `dist/` is the static build output. No secrets, API keys, accounts or subscriptions are needed. Fonts, scene geometry and all match data ship with the app; runtime does not call external model or asset services.

## What works

- A procedurally built stadium, pitch markings, goals, dugouts and 22 animated fictional players.
- One 30-second attack with a coherent ball path, three completed passes and a goal changing the score from 1–1 to 2–1.
- One authoritative replay clock: pause, play, scrub, speed, event jumps and rewind all reconstruct the same positions, possession and score.
- Orbit/zoom, four camera presets, click-to-select players, and selection through the mini-pitch or dropdown.
- Custom pitch positions and preset views with preview, confirmation, cancel, brief fade, undo and return to seat.
- Passing-lane and runner overlays tied to explicit evidence times. These show the featured pass/run, not live predictive analysis.
- Local scripted explanations calculated from match trajectories, with evidence links, fan/analyst detail, English/Spanish explanation text and a whole-sequence recap.
- Supported typed commands, including contextual “why was he free?” for the selected player. Unsupported requests are acknowledged without executing a guessed action.
- Keyboard controls, responsive layout, helpful unsupported-VR behaviour and a WebGL fallback message.
- Bottom pill dock in both normal and fullscreen modes: Timeline, Location, Menu and Settings. One shared set of controls preserves playback, selections, preferences and the open panel when switching modes. Panels fit the stadium window and scroll when needed.

## Desktop controls

| Action | Control |
| --- | --- |
| Orbit / zoom | Drag the scene / mouse wheel or touch gestures. |
| Play / pause | Play button or Space when focus is outside a form control. |
| Rewind / advance | ±5s buttons or left/right arrow keys for ±3s. |
| Seek | Timeline or the four event buttons. Timeline also supports native Home/End keys. |
| Select player | Click a figure/mini-pitch dot, or use the player dropdown. |
| Change view | Select a viewpoint, inspect the preview, then Move here. |
| Choose a location | Pick a position, click either pitch, then confirm. |
| Undo / cancel | Undo move / Cancel button or Escape. |
| Investigate | Choose a question and follow its timestamped evidence links. |
| Bottom pills | Use Timeline for playback, Location for viewpoints, Menu for questions/commands/help, and Settings for preferences. Tap an active pill or the close button to uncover the pitch. Available in normal and fullscreen modes. |
| Fullscreen | Use the expand button in the stadium corner. The dock, replay state and current panel carry across both modes. |

Example commands: `freeze`, `back three seconds`, `rewind to before the pass`, `slow it down`, `show me that passing lane`, `why was he free?`, `explain this player`, `recap`, `keeper view`, `give me a better angle`, `return to seat`, `confirm`, `cancel`, `undo move`, `clear everything. play.`

“Before the pass” uses the most recent pass at the current replay time, falling back to the first pass. The dedicated Vela question selects Vela; pronouns use the current selection. The recap deliberately includes the final goal even if the clock is earlier, and is labelled as covering the full moment.

## WebXR implementation and hardware boundary

The code feature-detects immersive VR and uses Three.js's [WebXR manager](https://threejs.org/docs/pages/WebXRManager.html). It includes two controller rays, trigger selection, a world-space timeline and replay panel, player selection, ground-point destination preview, explicit confirmation, fades and desktop restoration on session exit.

Grip summons the control panel. In VR, point at a player to select; point at the pitch to preview a destination; use Confirm move in the panel. The panel also supports rewind, before-pass, explanation, undo, return to seat, clear/play and exit.

**Actual Quest 2 testing has not occurred.** Open the hosted HTTPS test URL in Meta Quest Browser to try immersive entry. The desktop loopback address remains local to the Mac. Hosting did not install an APK, change device settings or create a tunnel.

Before claiming headset readiness, verify session entry/exit, controller aim, panel placement, text readability, timeline selection, two-step movement, fade comfort and sustained frame rate on the actual Quest 2. Hand tracking, speech input and narrated audio are not implemented.

## Verification on 15 October 2026

- `npm test`: six meaningful tests covering all 22 players, deterministic sampling after arbitrary seeks, score/pass rollback, ball continuity, derived metrics, selected-player evidence, clock bounds and safe command parsing.
- `npm run build`: TypeScript and production bundle passed. Vite reports the expected large 3D-engine bundle (about 625 kB minified / 161 kB gzip); this is not a headset performance measurement.
- Browser: goal → 2–1; rewind → 1–1; playback/pause; before-pass command → 20.5s; viewpoint preview/confirm/cancel/undo; mini-pitch location selection; English/Spanish analyst text; selected-player pronoun handling; unsupported command response; timeline Home/End and arrow-key seek; unsupported-VR help.
- Visual inspection: default desktop viewport and a 390×844 override. No horizontal overflow at the narrow size. No browser warnings or errors were returned during the exercised flows.
- Fullscreen dock: pointer-dragged the timeline from 18s to 5.65s; checked goal seek, keyboard Home, play, viewpoint preview/confirm/undo, custom mini-pitch selection, settings, commands and Help. Verified exit/re-entry preserves the same controls and preferences. At 390×844, the timeline panel stays within the viewport and dock targets measure at least 84×57px. This is a desktop browser viewport check, not a physical phone test.

- Normal-mode dock follow-up: all four panels checked at 320px viewport width without horizontal overflow; timeline seeks, viewpoint preview/cancel, Help and speed preferences work. Fullscreen entry/exit preserves the selected panel and replay timestamp.

## Recheck on 19 October 2026

The existing six replay tests and TypeScript/Vite production build pass. The build still reports the large Three.js bundle warning; this does not establish Quest performance. Source is now published at [brensterbaz/inside-the-moment](https://github.com/brensterbaz/inside-the-moment), with environment files, hosting settings and the imported conversation excluded. The [Azure integration proposal](AZURE_INTEGRATION.md) defines the next backend milestone; no provider adapter or cloud resource has been implemented by this documentation/repository task. No new desktop interaction or hardware test was performed during this recheck.

## Architecture

`match.ts` holds authored records. `replay.ts` samples them without hidden history. `analyst.ts` derives structured answers and evidence. `stadium.ts` renders the clock's state. `xr.ts` sends headset interactions through the same actions. `main.ts` connects those actions to the desktop interface. `replay-dock.ts` mounts the same DOM controls in shared scene panels for normal and fullscreen modes, keeping their listeners and state intact.

The local analyst has an explicit answer shape (`title`, `body`, `evidence`, `metric`, `metricLabel`) so a future server-side Microsoft Foundry adapter can preserve the evidence contract. No simulated answer is presented as a model response. Azure Speech, Foundry and hosting remain conditional on confirmed credits and an authorised integration step.
