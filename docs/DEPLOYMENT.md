# HTTPS headset test site

Live URL: **https://inside-the-moment.vercel.app/**

Published on 15 October 2026 after the user authorised HTTPS hosting. This is the first playable test site, not a finished hackathon submission or a hardware-verified Quest release.

## Open on Quest 2

1. Open Meta Quest Browser in the headset.
2. Go to `https://inside-the-moment.vercel.app`.
3. Select **Enter VR** and accept the headset's immersive-session prompt if shown.
4. Use trigger to select; grip shows or hides the floating control panel. Choose a location, then confirm to move.

The browser pills and the in-headset floating panel are separate interfaces. The headset panel supports timeline selection, play/pause, rewind, explanations, movement confirmation, undo and exit. Actual headset entry, controller aim, readability, comfort and frame rate still need physical testing.

## Hosting record

- Provider: Vercel, existing `brendans-projects-26a04470` team.
- Dedicated project: `inside-the-moment`.
- Deployment: `dpl_J2gL7zFYtPN4PP7oHMzqqLHbAbBk`, reported `READY`.
- Vercel target: production, providing the stable public test URL above. This does not assert production product readiness.
- Only the prebuilt static app was deployed: 19 files, 884,660 bytes. No cloud API/model service or database was added.
- The stable URL opens without Vercel authentication; generated deployment URLs may still use Vercel's default protection.
- Responses request `noindex, nofollow`. The test site is public to anyone with its URL; this header is not access control.
- Local workspace linkage is in ignored `.vercel/`. CLI-generated `.env.local` is also ignored and was not deployed.

## Update the hosted build

From this workspace, after authorisation for the next release:

```sh
npm test
npm run build:https
npx --yes vercel@63.1.0 deploy --prebuilt --prod --yes --scope brendans-projects-26a04470 --project inside-the-moment
```

`scripts/prepare-hosting.mjs` copies `dist/` into `.vercel/output/static` and writes Vercel's Build Output API configuration. Deploy with `--prebuilt` to upload that package. Project notes, source files, environment files and dependencies are outside the deployment payload. No public Git repository was created.

The CLI version is pinned because 64.2.0's local installation had missing optional/native dependencies during this setup; 63.1.0 completed successfully.

## Public source repository — 19 October 2026

The user authorised publication of [brensterbaz/inside-the-moment](https://github.com/brensterbaz/inside-the-moment). Its default branch is `main`; the initial source commit is `8b9f6a5`. The repository includes the app, tests, dependency lockfile, project documentation and third-party notices. Environment files, `.vercel/`, generated builds, dependencies and the imported chat archive are excluded. A pattern-based scan of the initial 30 tracked files found no credential matches; this is not a guarantee that every possible secret format is detectable.

GitHub publication does not deploy a new app version or connect Azure. The static Vercel test site remains separate.

## Verification

- Six replay tests passed; TypeScript and Vite build passed.
- HTTPS GET returned 200 without authentication, with an HSTS header.
- SHA-256 hashes of all 19 served files matched `dist/`.
- Source notes, `.env.local` and `src/main.ts` returned 404.
- Live browser rendered the 3D scene and compact dock; seeking to the goal changed the score to 2–1, and rewinding restored 1–1.
- No browser warnings or errors were returned during these checks.
- Physical Quest 2 verification remains pending.
