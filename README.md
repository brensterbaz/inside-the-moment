# Inside the Moment

A football replay experience for Meta Quest 2: step inside a synthetic match moment, control time and viewpoint, and ask an AI analyst to explain the play using the underlying event data.

## Project status

Project context imported into this Codex workspace on **15 October 2026** from [Design AR Football Experience](https://chatgpt.com/share/6ad0d5bf-3c78-83ed-906e-1a1c96e121b5).

The shared link exposed five messages containing the concept, proposed build and Azure funding constraint. No source code, downloadable project or assets were present. **The first local playable version is now built:** a synthetic stadium replay, desktop controls, viewpoint preview/confirmation, player selection and a clearly labelled scripted analyst. WebXR controls are implemented, but actual Quest 2 verification is pending.

## Run the first version

**HTTPS headset test:** [inside-the-moment.vercel.app](https://inside-the-moment.vercel.app/). Open it in Meta Quest Browser and select **Enter VR**. Hosting and desktop checks passed; actual headset testing remains pending. See [deployment details](docs/DEPLOYMENT.md).

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:5174/**. Open Timeline to play or jump to the decisive pass. Open Location and choose On the pitch → Move here. Try `rewind to before the pass` in the command bar inside Menu. The four bottom pills work in normal and fullscreen modes.

`npm test` checks the replay logic; `npm run build` type-checks and creates `dist/`. No cloud credentials are required. See [local build and controls](docs/LOCAL_BUILD.md).

## Start here

- [Project brief](docs/PROJECT_BRIEF.md): experience, scope, architecture, decisions and build order.
- [Hackathon requirements](docs/HACKATHON.md): official sources and dates checked during import.
- The imported shared-chat archive is retained locally and excluded from the public repository.
- [Official participant brief](docs/source/OFFICIAL_BRIEF.md): imported challenge, judging rubric, submission details and resource links.
- [Codex working instructions](AGENTS.md): context to preserve in future work.

The [full participant brief](https://innovationstudio.microsoft.com/hackathons/insidethegamedeveloperhackathon/home/getting_started) and expanded challenge were read in the user's signed-in Chrome session. The plan now maps the five-stage insights pipeline to the VR/desktop experience. No Azure credit offer was visible in the pages reviewed; funding remains unconfirmed.

## Next build milestone

Test the WebXR entry, controller interaction, floating panel, movement and performance on the actual Quest 2 using a secure development origin. Then connect genuine voice/AI services once credits are confirmed. The local desktop version is verified; it is not a completed competition entry.

Azure Speech, Microsoft Foundry and hosted APIs remain conditional on confirmed hackathon credits. The static HTTPS test site is published on the existing Vercel account. The [public source repository](https://github.com/brensterbaz/inside-the-moment) was created on **19 October 2026**. No AI service, database or hackathon submission has been created.
