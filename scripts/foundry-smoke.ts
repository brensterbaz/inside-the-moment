import { writeFile, mkdir } from "node:fs/promises";

// Opt-in only: normal tests never load a model or download weights.
const base = "http://127.0.0.1:5175";
const health = await fetch(`${base}/api/analysis/health`).then((r) => r.json());
if (health.phase !== "ready")
  throw new Error(
    `Start npm run dev:foundry and wait for readiness (current: ${health.phase}).`,
  );
const cases = [
  { topic: "space", detail: "fan", language: "en", selected: "h9", time: 23 },
  {
    topic: "space",
    detail: "analyst",
    language: "en",
    selected: "h9",
    time: 23,
  },
  { topic: "space", detail: "fan", language: "es", selected: "h9", time: 23 },
  {
    topic: "space",
    detail: "analyst",
    language: "es",
    selected: "h9",
    time: 23,
  },
  {
    topic: "pass",
    detail: "analyst",
    language: "en",
    selected: "h9",
    time: 23,
  },
  { topic: "recap", detail: "fan", language: "en", selected: "h9", time: 30 },
  { topic: "recap", detail: "fan", language: "es", selected: "h9", time: 30 },
  {
    topic: "player",
    detail: "analyst",
    language: "en",
    selected: "h7",
    time: 20.5,
  },
];
const results: unknown[] = [];
for (const input of cases) {
  const response = await fetch(`${base}/api/analysis`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(60_000),
  });
  const output = await response.json();
  results.push({ input, status: response.status, output });
  console.log(JSON.stringify({ input, status: response.status, ...output }));
}
await mkdir("output", { recursive: true });
await writeFile(
  "output/foundry-smoke.json",
  JSON.stringify(
    { checkedAt: new Date().toISOString(), health, results },
    null,
    2,
  ),
);
if (results.some((r) => (r as { status: number }).status !== 200))
  process.exitCode = 1;
