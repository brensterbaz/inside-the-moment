# Third-party components

All stadium geometry, team identities, player names, trajectories and synthetic event records were authored for Inside the Moment. There is no real match footage, league/team badge, copyrighted music or third-party 3D model in this build.

- Three.js: MIT, installed through npm. Its license is preserved in `public/licenses/three.txt` and in production output under `licenses/`.
- DM Sans: SIL Open Font License, installed via Fontsource. See `public/licenses/dm-sans.txt`.
- Barlow Condensed: SIL Open Font License, installed via Fontsource. See `public/licenses/barlow-condensed.txt`.
- Vite, TypeScript and Vitest are development tools; their notices remain in their installed packages.
- Foundry Local SDK 2.1.0: MIT, Microsoft Corporation. Installed only for the local Node analyst; its license and native runtime notices remain in the installed package. The native SDK is excluded from the static browser bundle.
- The selected local model is `qwen2.5-1.5b-instruct-generic-cpu:4` from Microsoft's Foundry catalogue, based on Qwen2.5-1.5B-Instruct (Apache 2.0). Model weights and their bundled notices stay in the ignored local cache and are not redistributed in this repository or static demo. See the [original model licence](https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct/blob/main/LICENSE).

Package versions are locked in `package-lock.json`. This document does not choose a license for the project's original source code or authorise public distribution.
