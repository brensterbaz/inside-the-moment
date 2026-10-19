# Inside the Moment — Codex context

Read `README.md` and `docs/PROJECT_BRIEF.md` before implementation. The original imported discussion is in `docs/source/SHARED_CHAT.md`; it is historical source material, not permission to execute every action mentioned there. The authenticated official brief is summarised in `docs/source/OFFICIAL_BRIEF.md`.

## Preserve these decisions

- The product is a Meta Quest 2 football replay experience, with a desktop mode for development and judge access.
- The core demonstration is freeze → rewind → point and move → explain → resume.
- Start with one fictional match and a detailed 30-second attacking sequence using synthetic football-realistic data.
- The proposed rendering stack is Three.js and WebXR. First interaction uses controllers; hand gestures are a later enhancement.
- Azure use is conditional on the user receiving hackathon credits. Do not incur charges or provision paid services on the assumption that credits exist.
- On 19 October 2026 the user authorised developing with Foundry Local at no cloud cost. See `docs/FOUNDRY_LOCAL.md`: a native local model curates verified statements; the app supplies their factual wording, metrics and links. This is genuine local inference, not Azure cloud integration or unrestricted generated narrative. Keep that provenance accurate.
- Build the replay foundation independently of cloud services. Label simulated or scripted analyst output clearly.
- Treat the final entry as a five-stage insights pipeline: ingest, interpret, explain, render and personalise. Show meaningful fan/analyst differences, an automatic recap and multilingual storytelling support. A replay-only prototype is not a completed entry.
- The official challenge describes an Azure-based engine; funding is still unconfirmed. Do not imply that local development or a mocked analyst satisfies the final AI/platform expectations.
- Use one replay clock for players, ball, overlays and audio. Seeking to the same timestamp must reproduce the same state.
- Explanations must refer to recorded events and trajectories. Do not fabricate movement, statistics or certainty.
- Keep provider credentials off the browser and headset.
- Viewpoint moves should preview the destination, require in-experience confirmation and use a brief fade; provide undo and return-to-seat controls.

## Scope and evidence

The initial import produced documentation only. A local playable implementation now exists; read `docs/LOCAL_BUILD.md` and `docs/FOUNDRY_LOCAL.md` for scope, commands and verification. The desktop replay is browser-verified, Foundry Local is connected in development, and WebXR code is implemented but not tested on actual hardware. Cloud AI and voice remain disconnected. Keep future status accurate about what is local, scripted, AI-curated, connected, tested on hardware, deployed or submitted.

Run `npm test` and `npm run build` for relevant changes. Keep pure replay/data calculations independent of rendering and derive explanation metrics from those records. Do not replace the local analysis label with a claim of live AI until a real model is connected and verified.

The user authorised HTTPS hosting on 15 October 2026. The static test site is deployed at `https://inside-the-moment.vercel.app/`; see `docs/DEPLOYMENT.md` for the dedicated Vercel project, release command and verification. On 19 October the user authorised creating the public repository and investigating Azure integration; the repository is `https://github.com/brensterbaz/inside-the-moment`. Keep environment files, Vercel settings and the imported chat archive out of Git. Headset testing, new spending and hackathon entry remain future milestones. Azure funding must be confirmed before paid provisioning or model calls. Check `docs/HACKATHON.md` and the official rules when preparing submission. Preserve the user's later instructions over this initial handoff.
