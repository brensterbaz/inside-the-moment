# Quest Wi-Fi session with Foundry Local

The current build can be opened in Quest Browser through a temporary, access-code-protected HTTPS relay. The headset renders the replay; Foundry inference runs on the Mac. This path does not require an Azure subscription, paid API, Cloudflare account, sideloaded APK, USB connection or certificate exception.

This is a temporary development session, not the permanent Vercel test site. The relay travels through Cloudflare rather than staying entirely on the LAN. The gateway is bound to Mac loopback, serves only the dedicated static build and proxies two authenticated analysis endpoints. Keep the URL and code private, keep the Mac awake with the lid open, and stop the relay when finished.

## Start on the Mac

Requires the existing Node.js dependencies and `cloudflared` CLI. On this Mac, Cloudflare's free CLI was installed with `brew install cloudflared`; no account, billing, named tunnel or background service was configured.

1. Run `npm run dev:foundry` and wait for the model to be ready. Reuse it if already running.
2. In another terminal, build and start the gateway:

```sh
npm run build:headset
npm run headset:serve
```

3. In a third terminal, start the HTTPS relay:

```sh
cloudflared tunnel --url http://127.0.0.1:5176 --no-autoupdate
```

The gateway prints an eight-digit access code. The relay prints a temporary `https://…trycloudflare.com` URL. The gateway/session expires four hours after it starts; restarting it changes the code and invalidates old cookies. Restarting the tunnel changes the URL. Local session details are saved in ignored `.foundry/headset-session.json` with owner-only permissions; the cookie token is never saved there.

The regular `npm run build` output retains its disabled local-AI control. `build:headset` separately enables local AI and writes only to ignored `.foundry/headset-build`. Never upload the native SDK, weights, `.foundry` directory or workspace source as a static site.

## Open in the Quest

1. Open **Meta Quest Browser** in the headset and enter the current temporary HTTPS URL.
2. Enter the access code and choose **Open the replay**.
3. Choose **Enter VR** and accept the headset's immersive-session prompt.
4. Trigger selects controls. Grip summons or hides the floating panel. Use its questions to request a local explanation; a successful result is labelled **AI-CURATED · LOCAL**.
5. Try pause → rewind → preview/confirm a viewpoint → explain → resume. Movement still requires in-experience confirmation, with undo and return to seat available.

The code must be entered before starting VR. VR still requires the headset browser, its permissions and a user click; a desktop browser displaying the page does not prove that immersive VR is working.

## Stop and troubleshoot

Stop the `cloudflared` terminal with Ctrl+C to remove external access immediately. Stop `headset:serve` with Ctrl+C to revoke the browser session too. The model/dev server can be stopped independently. No login item or permanent tunnel is installed.

- A sleeping or disconnected Mac interrupts the replay's network/API access.
- If the browser loses its session or the four-hour period expires, start a new gateway and use its new code.
- If **Enter VR** cannot start, use Meta Quest Browser on the HTTPS URL and check its permission prompt. Controller aim, panel readability, comfort and frame rate still require actual headset testing.
- If Foundry is busy/unavailable, the app labels and displays its scripted fallback. Loading the 3D scene is not proof of a completed AI request.
- The gateway accepts eight incorrect codes per minute, requires a same-origin login/API request, uses a Secure/HttpOnly/SameSite session cookie and limits request bodies to 2KB. It serves an exact build manifest; paths such as `.env.local`, source files, imported notes and model/session files are unavailable.

## Verification on 19 October 2026

- **21 tests passed**, including four gateway HTTP tests for authentication, origin checks, source-path isolation, body limits, invalid cookies, failed-code throttling and expiry. TypeScript and ordinary/headset production builds passed; the existing bundle-size warning remains.
- The actual HTTPS relay returned 401 before login, 303 after valid login and 200 for the authenticated build/health/analysis routes. Source files, imported chat, environment and session paths returned 404; foreign origins returned 403, oversized input 413 and an unknown player 400.
- Playwright completed the code form in Chrome, loaded the stadium canvas in a secure context, used the local analysis control and received a **fresh** native Foundry response through the relay. It identified Luca Reed, calculated 8.3km/h at 18.0s and linked that timestamp; native generation took 3,651ms. A separate fresh HTTP check took 9,605ms. These are observations on this Mac, not a latency guarantee.
- Authentication responses intentionally produce initial HTTP 401 console entries. No application console errors appeared after unlocking. Screenshot and live-response evidence remain ignored under `output/`.
- Browser checks establish transport and desktop rendering/analysis. Physical headset entry, controllers, comfort and performance remain pending user/device confirmation.

## References

- [Cloudflare Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/): accountless temporary URLs, lifetime and development limitations.
- [Meta browser debugging](https://developers.meta.com/vr/documentation/web/browser-remote-debugging/): an optional USB/local-host alternative.
- [WebXR secure contexts](https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API/Startup_and_shutdown).
