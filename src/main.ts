import "./style.css";
import "./replay-dock.css";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "@fontsource/dm-sans/latin-600.css";
import "@fontsource/dm-sans/latin-700.css";
import "@fontsource/barlow-condensed/latin-500.css";
import "@fontsource/barlow-condensed/latin-600.css";
import { players, events, keyMoments, MATCH_START, type Point } from "./match";
import {
  ReplayClock,
  sampleMatch,
  playerAt,
  playerSpeed,
  parseCommand,
  clamp,
  type Topic,
} from "./replay";
import { explain, type Detail, type Language } from "./analyst";
import { Stadium, views, type View } from "./stadium";
import { XRExperience } from "./xr";
import { ReplayDock } from "./replay-dock";
import { AnalysisClient, RecapTrigger } from "./analysis-client";
import type { AnalysisRequest, AnalysisResult } from "./analysis-contract";

const icon = (name: string) => {
  const paths: Record<string, string> = {
    play: '<path d="m9 5 11 7-11 7V5Z"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    back: '<path d="m9 6-6 6 6 6M4 12h10a6 6 0 1 1 0 12"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    vr: '<rect x="2" y="6" width="20" height="13" rx="5"/><path d="m8 13 1-1m6 1 1-1M7 6V4h10v2"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 5 2c-2 1-2 2-2 3m0 3h.01"/>',
    layers: '<path d="m12 3 10 6-10 6L2 9l10-6Zm-9 12 9 6 9-6"/>',
    target:
      '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 1v4m0 14v4M1 12h4m14 0h4"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
    collapse: '<path d="M3 8h5V3m8 0v5h5M8 21v-5H3m18 0h-5v5"/>',
    timeline: '<path d="M4 6v12m16-12v12M4 12h16M9 8v8m6-11v14"/>',
    location:
      '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h10"/>',
    settings:
      '<path d="M4 7h5m4 0h7M4 17h10m4 0h2"/><circle cx="11" cy="7" r="2"/><circle cx="16" cy="17" r="2"/>',
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.arrow}</svg>`;
};
const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `
  <header class="app-header">
    <a class="brand" href="#main" aria-label="Inside the Moment, skip to experience"><span class="brand-mark">i<span>/</span>m</span><span>inside the moment<span class="brand-sub">FOOTBALL, FROM WITHIN.</span></span></a>
    <div class="header-centre"><span class="live-dot"></span> THE REPLAY ROOM <span class="edition">01</span></div>
    <div class="header-actions"><button id="help" class="icon-button" aria-label="Open controls and help">${icon("help")}</button><button id="enter-vr" class="vr-button">${icon("vr")}<span>Enter VR</span></button></div>
  </header>
  <main id="main" class="workspace">
    <section class="replay-column" aria-label="Replay experience">
      <div class="section-heading"><div><span class="eyebrow">A DIFFERENT WAY TO SEE THE GAME</span><h1>Don’t just watch. <em>Be there.</em></h1></div><span class="synthetic-label"><span></span> Original synthetic match</span></div>
      <div class="viewport" id="viewport">
        <div id="scene"></div>
        <div class="scoreboard"><span class="club-code home-code">NBF</span><span class="score" id="score">1 <b>–</b> 1</span><span class="club-code away-code">EFA</span><span class="match-time" id="match-time">87:30</span></div>
        <div class="scene-top-right"><span class="replay-indicator" id="replay-indicator">PAUSED</span><button class="icon-button scene-expand" id="fullscreen" aria-label="Expand replay">${icon("expand")}</button></div>
        <div class="scene-story"><span class="eyebrow">MOMENT 01 / THE LATE WINNER</span><h2>One run.<br>Everything changes.</h2><p>Northbank FC <span>vs</span> Eastford Athletic</p></div>
        <div class="scene-tools"><button id="layers" class="overlay-button" aria-pressed="false">${icon("layers")} Passing lane</button><button id="move-mode" class="overlay-button" aria-pressed="false">${icon("target")} Pick a position</button></div>
        <div class="scene-hint" id="scene-hint">Drag to look around · Scroll to move closer</div>
        <div class="move-confirm" id="move-confirm" hidden><div><span class="eyebrow">PREVIEW YOUR NEXT VIEW</span><strong id="pending-view"></strong><small>Confirm to move with a brief fade.</small></div><button id="confirm-move" class="primary-button">Move here ${icon("arrow")}</button><button id="cancel-move" class="icon-button" aria-label="Cancel viewpoint change">${icon("close")}</button></div>
        <div class="view-fade" id="view-fade"></div>
        <div class="scene-error" id="scene-error" hidden><h2>3D needs WebGL</h2><p>Enable hardware acceleration or use a compatible browser. The timeline and local analysis still work through the bottom controls.</p></div>
      </div>
      <section class="replay-desk" aria-label="Replay controls">
        <div class="transport"><button id="rewind" class="transport-small" aria-label="Rewind 5 seconds"><span>↶</span>5s</button><button id="play" class="play-button" aria-label="Play replay">${icon("play")}</button><button id="forward" class="transport-small" aria-label="Forward 5 seconds"><span>↷</span>5s</button><div class="time-readout"><strong id="time">00:18.0</strong><span>/ 00:30</span></div><div class="transport-spacer"></div><label class="speed-label">SPEED<select id="speed" aria-label="Playback speed"><option value="0.25">0.25×</option><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="1.5">1.5×</option></select></label></div>
        <div class="timeline-wrap"><input id="timeline" type="range" min="0" max="30" step="0.05" value="18" aria-label="Replay time in seconds"/><div class="timeline-markers" aria-hidden="true">${keyMoments.map((e) => `<i style="left:${(e.time / 30) * 100}%"></i>`).join("")}</div></div>
        <div class="moment-list">${keyMoments.map((e, i) => `<button data-moment="${e.id}"><span>0${i + 1}</span>${["Build-up", "Break the line", "The decisive pass", "The goal"][i]}<small>${e.time.toFixed(1)}s</small></button>`).join("")}</div>
        <div class="view-strip"><span class="eyebrow">YOUR PERSPECTIVE</span><div class="view-buttons">${Object.entries(
          views,
        )
          .map(
            ([id, v], i) =>
              `<button data-view="${id}" aria-pressed="${i === 0}"><span>${["◫", "⌑", "⊙", "◉"][i]}</span>${v.name}</button>`,
          )
          .join(
            "",
          )}</div><button id="undo" class="text-button" disabled>Undo move</button></div>
      </section>
      <form id="command-form" class="command-bar"><span class="command-icon">›_</span><label class="sr-only" for="command">Replay command</label><input id="command" autocomplete="off" maxlength="180" placeholder="Try “rewind to before the pass”"/><span class="command-tag">LOCAL COMMANDS</span><button type="submit" aria-label="Run replay command">${icon("arrow")}</button></form>
      <div class="status-line"><span id="status" role="status">Open Timeline to play, rewind or jump to the decisive pass.</span><span class="shortcut">SPACE <span>play / pause</span></span></div>
    </section>
    <aside class="insight-column" aria-label="Match insights">
      <div class="insight-heading"><span class="eyebrow">SEE THE WHY</span><span class="local-badge" id="analysis-badge">SCRIPTED DEMO</span></div>
      <h2 class="insight-title">A little perspective.<br>A different game.</h2>
      <div class="analyst-settings"><div class="segmented" aria-label="Explanation detail"><button data-detail="fan" aria-pressed="true">Fan</button><button data-detail="analyst" aria-pressed="false">Analyst</button></div><label class="sr-only" for="language">Explanation language</label><select id="language" aria-label="Explanation language"><option value="en">EN</option><option value="es">ES</option></select></div>
      <div class="analysis-controls"><label><input id="local-ai" type="checkbox"/> Use local AI</label><button id="analysis-run" class="text-button" disabled>Generate explanation ↗</button><p id="analysis-status" role="status">Scripted mode · local AI not connected</p></div>
      <div class="question-list"><button data-topic="space" aria-pressed="true">Why was Vela free? <span>↗</span></button><button data-topic="pass" aria-pressed="false">Show me the decisive pass <span>↗</span></button><button data-topic="recap" aria-pressed="false">Recap this moment <span>↗</span></button></div>
      <article class="answer" id="answer" aria-label="Match explanation"><div class="answer-symbol">✳</div><span class="eyebrow" id="answer-context">FEATURED MOMENT · 23.0s</span><h3 id="answer-title"></h3><p id="answer-body"></p><div class="answer-metric"><strong id="metric"></strong><span id="metric-label"></span></div><div class="evidence" id="evidence"></div><p class="source-note" id="analysis-source">Scripted explanation calculated from our authored match. Voice is not connected.</p></article>
      <section class="tactical" aria-label="Tactical overview"><div class="tactical-heading"><h3>The whole picture</h3><span>ATTACKING →</span></div><svg id="minimap" viewBox="-57 -39 114 78" role="img" aria-label="Live tactical pitch. Use the player dropdown or scene to select players."><rect class="map-turf" x="-56" y="-38" width="112" height="76" rx="3"/><g class="map-lines"><rect x="-52.5" y="-34" width="105" height="68"/><path d="M0-34V34"/><circle r="9.15"/><path d="M-52.5-20.16H-36V20.16H-52.5M52.5-20.16H36V20.16H52.5M-52.5-9.16H-47V9.16H-52.5M52.5-9.16H47V9.16H52.5"/></g><g id="map-players"></g><circle id="map-ball" r="1.1" fill="#fff"/><circle id="map-destination" r="2.4" fill="none" stroke="#d8ff8d" stroke-width=".6" visibility="hidden"/></svg><div class="map-caption"><span><i class="home-dot"></i>Northbank <i class="away-dot"></i>Eastford</span><button id="map-move" class="text-button">Choose a viewpoint ↗</button></div></section>
      <section class="selected-player"><div class="shirt-number" id="shirt-number">9</div><div><label class="eyebrow" for="player-select">FOLLOW A PLAYER</label><select id="player-select">${players.map((p) => `<option value="${p.id}" ${p.id === "h9" ? "selected" : ""}>${p.name}</option>`).join("")}</select><span id="player-role">Centre forward · Northbank</span></div><button id="player-info" class="icon-button" aria-label="Explain selected player">${icon("arrow")}</button></section>
      <div class="data-strip"><div><span>COMPLETED PASSES</span><strong id="pass-count">2</strong></div><div><span>PLAYER SPEED</span><strong><span id="player-speed">0.0</span><small>km/h</small></strong></div></div>
    </aside>
  </main>
  <footer class="app-footer"><span>INSIDE THE MOMENT <b>/</b> FIRST PLAYABLE</span><span>Original teams. Synthetic data. A new perspective.</span></footer>
  <dialog id="help-dialog"><button class="dialog-close icon-button" id="close-help" aria-label="Close help">${icon("close")}</button><span class="eyebrow">MAKE THE MOMENT YOURS</span><h2>You’re in control.</h2><div class="help-grid"><div><h3>Explore</h3><p>Drag the stadium to orbit. Scroll to zoom. Click a player or choose their name. Pick a camera or a point on the pitch, then confirm your move.</p></div><div><h3>Control time</h3><p><kbd>Space</kbd> play/pause · <kbd>←</kbd> / <kbd>→</kbd> seek 3s · <kbd>Esc</kbd> cancel a move. Jump to an event or drag the timeline.</p></div><div><h3>Try a command</h3><p>“Freeze”, “back three seconds”, “rewind to before the pass”, “show me that passing lane”, “why was he free?”, “return to seat”, “clear everything. play.”</p></div><div><h3>On a headset</h3><p>Use a WebXR-compatible browser on a secure URL. Trigger selects players and the timeline. Point at the pitch, then confirm in the floating panel. Grip summons the panel.</p></div></div><div class="help-note"><strong>Check the explanation source.</strong> Foundry Local runs AI on the development Mac when connected. Scripted explanations remain available. Typed replay commands are deterministic; no microphone is used. Quest hardware testing and Azure cloud integration remain pending.</div></dialog>`;

const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const clock = new ReplayClock();
let selected = "h9",
  detail: Detail = "fan",
  language: Language = "en",
  topic: Topic = "space";
let pending: View | null = null,
  viewName = "The stand",
  layers = false,
  lastUI = 0,
  transitioning = false;
const history: View[] = [];
let stage: Stadium | undefined, xr: XRExperience | undefined;
const dock = new ReplayDock($("viewport"), icon, () => {
  if (pending) cancel();
});
const notify = (message: string) => {
  $("status").textContent = message;
};
const analysisClient = new AnalysisClient();
const recapTrigger = new RecapTrigger();
let localReady = false,
  useFoundry = import.meta.env.VITE_FOUNDRY_LOCAL === "1",
  analysisRevision = 0;
let sharedAnswer = explain(topic, detail, language, selected, clock.time);
let sharedSource = "SCRIPTED DEMO";
$<HTMLInputElement>("local-ai").checked = useFoundry;
$<HTMLInputElement>("local-ai").disabled =
  import.meta.env.VITE_FOUNDRY_LOCAL !== "1";
function answer(result?: AnalysisResult) {
  const a =
    result?.answer ?? explain(topic, detail, language, selected, clock.time);
  sharedAnswer = a;
  sharedSource = result ? "AI-CURATED · LOCAL" : "SCRIPTED DEMO";
  $("analysis-badge").textContent = sharedSource;
  $("analysis-source").textContent = result
    ? `AI-curated locally · ${result.model} · ${result.cached ? "cached selection" : `${(result.elapsedMs / 1000).toFixed(1)}s`}. The model selects verified statements; the app supplies their wording, required context, metrics and timestamp links.`
    : "Scripted explanation calculated from our authored match. Voice is not connected.";
  app.dataset.analysisState = result ? "foundry-local" : "scripted";
  $("answer").setAttribute("aria-busy", "false");
  $("answer-title").textContent = a.title;
  $("answer-body").textContent = a.body;
  $("metric").textContent = a.metric;
  $("metric-label").textContent = a.metricLabel;
  $("answer-context").textContent =
    topic === "player" || (topic === "space" && selected !== "h9")
      ? `SELECTED PLAYER · ${clock.time.toFixed(1)}s`
      : topic === "recap"
        ? "FULL MOMENT · 0–30s"
        : topic === "space"
          ? "FEATURED EVIDENCE · 18.0–23.0s"
          : "FEATURED EVIDENCE · 21.5–23.0s";
  $("evidence").replaceChildren();
  for (const e of a.evidence) {
    const b = document.createElement("button");
    b.textContent = `↗ ${e.label} · ${e.time.toFixed(1)}s`;
    b.onclick = () => {
      seek(e.time);
      setLayers(topic === "pass" || (topic === "space" && selected === "h9"));
      notify(`Showing evidence at ${e.time.toFixed(1)} seconds.`);
    };
    $("evidence").append(b);
  }
  document
    .querySelectorAll<HTMLButtonElement>("[data-topic]")
    .forEach((b) =>
      b.setAttribute(
        "aria-pressed",
        String(
          b.dataset.topic === topic && (topic !== "space" || selected === "h9"),
        ),
      ),
    );
}
function clearAnalysis() {
  analysisRevision++;
  analysisClient.invalidate();
  $<HTMLButtonElement>("analysis-run").disabled = !localReady || !useFoundry;
  $("analysis-status").textContent = !useFoundry
    ? "Scripted mode selected."
    : localReady
      ? "Foundry Local ready · choose a question or generate an explanation"
      : "Local AI is not connected. Showing a scripted explanation.";
  answer();
}
async function generateAnalysis() {
  clearAnalysis();
  if (!useFoundry || !localReady) return;
  clock.playing = false;
  updateUI();
  const revision = analysisRevision;
  const request: AnalysisRequest = {
    topic,
    detail,
    language,
    selected,
    time: Math.round(clock.time * 20) / 20,
  };
  app.dataset.analysisState = "loading";
  sharedSource = "LOCAL AI · GENERATING";
  $("analysis-status").textContent =
    "Generating locally on this Mac… Replay controls remain available.";
  $("answer").setAttribute("aria-busy", "true");
  $<HTMLButtonElement>("analysis-run").disabled = true;
  try {
    const result = await analysisClient.request(request);
    if (!result || revision !== analysisRevision) return;
    answer(result);
    $("analysis-status").textContent =
      `Foundry Local · ${result.cached ? "cached for this evidence and preferences" : "answer generated on this Mac"}`;
  } catch (error) {
    if (revision !== analysisRevision) return;
    answer();
    app.dataset.analysisState = "error";
    $("analysis-status").textContent =
      `${error instanceof Error ? error.message : "Local AI unavailable."} Showing the scripted explanation.`;
  } finally {
    if (revision === analysisRevision)
      $<HTMLButtonElement>("analysis-run").disabled =
        !localReady || !useFoundry;
  }
}
async function checkLocalAnalyst() {
  if (import.meta.env.VITE_FOUNDRY_LOCAL !== "1") return;
  try {
    const response = await fetch("/api/analysis/health", {
      signal: AbortSignal.timeout(3000),
    });
    const health = await response.json();
    localReady =
      response.ok &&
      health.provider === "foundry-local" &&
      health.phase === "ready";
    const generating = app.dataset.analysisState === "loading";
    $<HTMLButtonElement>("analysis-run").disabled =
      !localReady || !useFoundry || generating;
    if (!localReady) {
      $("analysis-status").textContent =
        health.phase === "error"
          ? "Local model setup failed. Scripted explanations remain available."
          : `Foundry Local: ${health.phase}${health.phase === "downloading" ? ` ${health.progress}%` : ""}. Scripted explanation shown while it starts.`;
      if (health.phase !== "error")
        window.setTimeout(() => void checkLocalAnalyst(), 3000);
    } else if (!generating)
      $("analysis-status").textContent =
        "Foundry Local ready · choose a question or generate an explanation";
  } catch {
    localReady = false;
    $("analysis-status").textContent =
      "Local analyst is not running. Scripted explanations remain available.";
    window.setTimeout(() => void checkLocalAnalyst(), 5000);
  }
}
function setTopic(next: Topic) {
  topic = next;
  clearAnalysis();
  if (useFoundry) void generateAnalysis();
  if (next === "space" || next === "pass")
    setLayers(next === "pass" || selected === "h9");
}
function engage() {
  $("viewport").classList.add("engaged");
}
function seek(time: number) {
  engage();
  clock.seek(time);
  clock.playing = false;
  updateUI();
  clearAnalysis();
}
function setLayers(value: boolean) {
  layers = value;
  if (stage) stage.analysis.visible = value;
  $("layers").setAttribute("aria-pressed", String(value));
  $("layers").innerHTML =
    icon("layers") + (value ? " Evidence overlay" : " Passing lane");
}
function select(id: string) {
  engage();
  selected = id;
  if (stage) stage.selected = id;
  $<HTMLSelectElement>("player-select").value = id;
  const p = players.find((p) => p.id === id)!;
  $("shirt-number").textContent = String(p.number);
  $("shirt-number").classList.toggle("away", p.team === "away");
  $("player-role").textContent =
    `${p.role} · ${p.team === "home" ? "Northbank" : "Eastford"}`;
  clearAnalysis();
  updateUI();
}
function preview(view: View) {
  dock.closePanel();
  pending = view;
  $("pending-view").textContent = view.name;
  $("move-confirm").hidden = false;
  stage?.preview({ x: view.position[0], z: view.position[2] });
  $("map-destination").setAttribute("cx", String(view.position[0]));
  $("map-destination").setAttribute("cy", String(view.position[2]));
  $("map-destination").setAttribute("visibility", "visible");
  notify(`Previewing ${view.name.toLowerCase()}. Confirm to move, or cancel.`);
}
function previewPoint(point: Point) {
  const b = sampleMatch(clock.time).ball;
  preview({
    name: "Your pitch-side position",
    position: [clamp(point.x, -51.5, 51.5), 1.7, clamp(point.z, -33, 33)],
    target: [b.x, 1, b.z],
  });
}
function cancel() {
  pending = null;
  $("move-confirm").hidden = true;
  stage?.preview(null);
  $("map-destination").setAttribute("visibility", "hidden");
  if (stage) stage.moveMode = false;
  $("move-mode").setAttribute("aria-pressed", "false");
  $("scene-hint").textContent = "Drag to look around · Scroll to move closer";
}
function move(view: View, save = true) {
  engage();
  if (!stage) {
    notify("3D is unavailable in this browser.");
    cancel();
    return;
  }
  if (transitioning) return;
  if (save) {
    history.push(
      stage.renderer.xr.isPresenting
        ? xr!.snapshot()
        : stage.snapshot(viewName),
    );
    if (history.length > 20) history.shift();
  }
  viewName = view.name;
  cancel();
  if (stage.renderer.xr.isPresenting) xr?.teleport(view);
  else {
    transitioning = true;
    $("view-fade").classList.add("active");
    setTimeout(() => {
      stage?.setView(view);
      setTimeout(() => {
        $("view-fade").classList.remove("active");
        transitioning = false;
      }, 100);
    }, 100);
  }
  $("undo").toggleAttribute("disabled", history.length === 0);
  document
    .querySelectorAll<HTMLButtonElement>("[data-view]")
    .forEach((b) =>
      b.setAttribute(
        "aria-pressed",
        String(views[b.dataset.view!].name === viewName),
      ),
    );
  notify(`${view.name}. Drag to adjust your angle.`);
}
function confirm() {
  if (pending) move(pending);
  else notify("Choose a viewpoint or point on the pitch first.");
}
function undo() {
  if (!history.length) {
    notify("No viewpoint changes to undo.");
    return;
  }
  move(history.pop()!, false);
}
function beforePass() {
  const pass =
    [...events]
      .reverse()
      .find((e) => e.type === "pass" && e.time <= clock.time) ??
    events.find((e) => e.type === "pass")!;
  seek(Math.max(0, pass.time - 1));
  notify(`One second before “${pass.label}”.`);
}
function toggle() {
  engage();
  clearAnalysis();
  clock.toggle();
  updateUI();
}
function runCommand(input: string) {
  engage();
  const c = parseCommand(input);
  if (c.type !== "explain") clearAnalysis();
  switch (c.type) {
    case "pause":
      clock.playing = false;
      notify("Frozen. Explore the moment.");
      break;
    case "play":
      if (clock.time >= 30) clock.seek(0);
      clock.playing = true;
      notify("Replay resumed.");
      break;
    case "seek-relative":
      seek(clock.time + c.seconds);
      notify(`Moved back ${-c.seconds} seconds.`);
      break;
    case "before-pass":
      beforePass();
      break;
    case "clear-play":
      setLayers(false);
      cancel();
      if (clock.time >= 30) clock.seek(0);
      clock.playing = true;
      notify("Overlays cleared. Replay resumed.");
      break;
    case "slow":
      clock.speed = 0.5;
      $<HTMLSelectElement>("speed").value = "0.5";
      clock.playing = true;
      notify("Playing at half speed.");
      break;
    case "explain":
      if (/vela|striker/i.test(input)) select("h9");
      setTopic(c.topic);
      notify(
        "Use the evidence links to inspect recorded positions. Check the explanation source for local AI or scripted output.",
      );
      break;
    case "seat":
      preview(views.stand);
      break;
    case "keeper":
      preview(views.keeper);
      notify(
        "Keeper viewpoint preview. This is an authored reconstruction, not a real player’s recorded view.",
      );
      break;
    case "better-angle":
      preview(views.pitch);
      break;
    case "undo":
      undo();
      break;
    case "confirm":
      confirm();
      break;
    case "cancel":
      cancel();
      notify("Move cancelled.");
      break;
    default:
      notify(
        "That command is not supported in this local demo. Try “freeze”, “back three seconds”, or open Help for the command list.",
      );
  }
  updateUI();
}
try {
  stage = new Stadium($("scene"));
  stage.onSelect = select;
  stage.onPoint = previewPoint;
  xr = new XRExperience(
    stage,
    (id, value) => {
      if (id === "toggle") toggle();
      if (id === "back") seek(clock.time - 3);
      if (id === "before") beforePass();
      if (id === "explain") setTopic("space");
      if (id === "seat") preview(views.stand);
      if (id === "confirm") confirm();
      if (id === "cancel") cancel();
      if (id === "undo") undo();
      if (id === "clear") runCommand("clear everything. play.");
      if (id === "seek") seek(value!);
      if (id === "exit") void stage!.renderer.xr.getSession()?.end();
    },
    () => ({
      time: clock.time,
      playing: clock.playing,
      selected: players.find((p) => p.id === selected)!.name,
      pending: !!pending,
      answer: sharedAnswer.body,
      source: sharedSource,
    }),
    notify,
  );
  void xr.detect().then((supported) => {
    $("enter-vr").classList.toggle("supported", supported);
    $("enter-vr").title = supported
      ? "Enter immersive VR"
      : "Open headset setup information";
  });
} catch (error) {
  console.error("3D scene unavailable", error);
  $("scene-error").hidden = false;
}

const svgNS = "http://www.w3.org/2000/svg";
const dots = new Map<string, SVGCircleElement>();
for (const p of players) {
  const dot = document.createElementNS(svgNS, "circle");
  dot.setAttribute("r", "1.5");
  dot.setAttribute("fill", p.team === "home" ? "#c1ec86" : "#efa780");
  const title = document.createElementNS(svgNS, "title");
  title.textContent = `${p.number} · ${p.name}`;
  dot.append(title);
  dot.addEventListener("click", (e) => {
    if (stage?.moveMode) return;
    e.stopPropagation();
    select(p.id);
  });
  $("map-players").append(dot);
  dots.set(p.id, dot);
}
function updateUI() {
  const snapshot = sampleMatch(clock.time);
  app.dataset.time = clock.time.toFixed(2);
  app.dataset.playing = String(clock.playing);
  $("score").innerHTML = `${snapshot.score[0]} <b>–</b> ${snapshot.score[1]}`;
  const match = Number(MATCH_START + clock.time);
  $("match-time").textContent = `${Math.floor(match / 60)}:${Math.floor(
    match % 60,
  )
    .toString()
    .padStart(2, "0")}`;
  $("time").textContent = `00:${clock.time.toFixed(1).padStart(4, "0")}`;
  $<HTMLInputElement>("timeline").value = String(clock.time);
  $("timeline").style.setProperty("--progress", `${(clock.time / 30) * 100}%`);
  $("timeline").setAttribute(
    "aria-valuetext",
    `${clock.time.toFixed(1)} seconds of 30`,
  );
  $("play").innerHTML = icon(clock.playing ? "pause" : "play");
  $("play").setAttribute(
    "aria-label",
    clock.playing ? "Pause replay" : "Play replay",
  );
  $("replay-indicator").textContent = clock.playing
    ? "REPLAY"
    : clock.time >= 30
      ? "FULL TIME"
      : "PAUSED";
  $("replay-indicator").classList.toggle("playing", clock.playing);
  $("pass-count").textContent = String(snapshot.passesCompleted);
  $("player-speed").textContent = playerSpeed(selected, clock.time).toFixed(1);
  document.querySelectorAll<HTMLButtonElement>("[data-moment]").forEach((b) => {
    const e = keyMoments.find((e) => e.id === b.dataset.moment)!;
    b.classList.toggle("reached", clock.time >= e.time);
  });
  for (const p of snapshot.players) {
    const dot = dots.get(p.id)!;
    dot.setAttribute("cx", String(p.x));
    dot.setAttribute("cy", String(p.z));
    dot.setAttribute("stroke", p.id === selected ? "#fff" : "none");
    dot.setAttribute("stroke-width", ".7");
    dot.setAttribute("r", p.id === selected ? "2" : "1.5");
  }
  $("map-ball").setAttribute("cx", String(snapshot.ball.x));
  $("map-ball").setAttribute("cy", String(snapshot.ball.z));
}
$("play").onclick = toggle;
$("rewind").onclick = () => seek(clock.time - 5);
$("forward").onclick = () => seek(clock.time + 5);
$<HTMLInputElement>("timeline").oninput = (e) =>
  seek(Number((e.target as HTMLInputElement).value));
$<HTMLSelectElement>("speed").onchange = (e) => {
  clock.speed = Number((e.target as HTMLSelectElement).value);
  notify(`Playback speed ${clock.speed}×.`);
};
document.querySelectorAll<HTMLButtonElement>("[data-moment]").forEach(
  (b) =>
    (b.onclick = () => {
      const e = events.find((e) => e.id === b.dataset.moment)!;
      seek(e.time);
      notify(e.detail);
    }),
);
document
  .querySelectorAll<HTMLButtonElement>("[data-view]")
  .forEach((b) => (b.onclick = () => preview(views[b.dataset.view!])));
document.querySelectorAll<HTMLButtonElement>("[data-topic]").forEach(
  (b) =>
    (b.onclick = () => {
      if (b.dataset.topic === "space") select("h9");
      setTopic(b.dataset.topic as Topic);
    }),
);
document.querySelectorAll<HTMLButtonElement>("[data-detail]").forEach(
  (b) =>
    (b.onclick = () => {
      detail = b.dataset.detail as Detail;
      document
        .querySelectorAll("[data-detail]")
        .forEach((el) =>
          el.setAttribute(
            "aria-pressed",
            String((el as HTMLElement).dataset.detail === detail),
          ),
        );
      clearAnalysis();
      if (useFoundry) void generateAnalysis();
    }),
);
$<HTMLSelectElement>("language").onchange = (e) => {
  language = (e.target as HTMLSelectElement).value as Language;
  clearAnalysis();
  if (useFoundry) void generateAnalysis();
  $("answer").lang = language;
};
$<HTMLSelectElement>("player-select").onchange = (e) =>
  select((e.target as HTMLSelectElement).value);
$("player-info").onclick = () => {
  setTopic("player");
  dock.open("menu");
};
$<HTMLInputElement>("local-ai").onchange = (e) => {
  useFoundry = (e.target as HTMLInputElement).checked;
  clearAnalysis();
  if (useFoundry) {
    void checkLocalAnalyst();
    void generateAnalysis();
  }
};
$("analysis-run").onclick = () => void generateAnalysis();
$("confirm-move").onclick = confirm;
$("cancel-move").onclick = () => {
  cancel();
  notify("Move cancelled.");
};
$("undo").onclick = undo;
$("layers").onclick = () => {
  setLayers(!layers);
  notify(
    layers
      ? "Showing Vela’s run (14–24s) and the decisive pass (21.5–23s)."
      : "Evidence overlay hidden.",
  );
};
function moveMode(useScene = true) {
  if (!stage) {
    notify("Pitch movement needs the 3D scene.");
    return;
  }
  stage.moveMode = !stage.moveMode;
  if (stage.moveMode && useScene) dock.closePanel();
  $("move-mode").setAttribute("aria-pressed", String(stage.moveMode));
  $("scene-hint").textContent = stage.moveMode
    ? "Click the pitch or mini-pitch to preview your position"
    : "Drag to look around · Scroll to move closer";
  notify(
    stage.moveMode
      ? "Choose a point on either pitch, then confirm the move."
      : "Position selection off.",
  );
}
$("move-mode").onclick = () => moveMode();
$("map-move").onclick = () => moveMode(false);
$("minimap").addEventListener("click", (e) => {
  if (!stage?.moveMode) return;
  const r = $("minimap").getBoundingClientRect();
  previewPoint({
    x: ((e.clientX - r.left) / r.width) * 114 - 57,
    z: ((e.clientY - r.top) / r.height) * 78 - 39,
  });
});
$<HTMLFormElement>("command-form").onsubmit = (e) => {
  e.preventDefault();
  const value = $<HTMLInputElement>("command").value.trim();
  if (value) runCommand(value);
  $<HTMLInputElement>("command").value = "";
};
const dialog = $<HTMLDialogElement>("help-dialog");
$("help").onclick = () => dialog.showModal();
$("close-help").onclick = () => dialog.close();
$("enter-vr").onclick = () => {
  if (xr?.supported) void xr.enter();
  else {
    dialog.showModal();
    notify(
      "Desktop is ready. Use the headset setup instructions in Help to try WebXR.",
    );
  }
};
$("fullscreen").onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await $("viewport").requestFullscreen();
  } catch {
    notify("Fullscreen is not available in this browser.");
  }
};
window.addEventListener("keydown", (e) => {
  if (
    dialog.open ||
    e.target instanceof HTMLInputElement ||
    e.target instanceof HTMLSelectElement ||
    e.target instanceof HTMLTextAreaElement
  )
    return;
  if (e.code === "Space" && !(e.target instanceof HTMLButtonElement)) {
    e.preventDefault();
    toggle();
  }
  if (e.key === "ArrowLeft") {
    e.preventDefault();
    seek(clock.time - 3);
  }
  if (e.key === "ArrowRight") {
    e.preventDefault();
    seek(clock.time + 3);
  }
  if (e.key === "Escape") {
    cancel();
    notify("Move cancelled.");
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && !stage?.renderer.xr.isPresenting) {
    clock.playing = false;
    updateUI();
  }
});
let previous = performance.now();
function frame(now: number) {
  const delta = Math.min((now - previous) / 1000, 0.1);
  previous = now;
  const wasPlaying = clock.playing;
  clock.tick(delta);
  if (recapTrigger.update(clock.time, wasPlaying)) {
    setTopic("recap");
    if (!pending && !stage?.renderer.xr.isPresenting) dock.open("menu");
    notify(
      "Full-moment recap · includes the final goal from the complete synthetic sequence.",
    );
  }
  stage?.update(clock.time, delta);
  xr?.update(now);
  stage?.render();
  if (now - lastUI > 90) {
    updateUI();
    lastUI = now;
  }
}
answer();
void checkLocalAnalyst();
updateUI();
if (stage) stage.renderer.setAnimationLoop(frame);
else {
  const loop = (now: number) => {
    frame(now);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
