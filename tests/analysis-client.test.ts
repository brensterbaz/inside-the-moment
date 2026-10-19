import { describe, it, expect, vi } from "vitest";
import { AnalysisClient, RecapTrigger } from "../src/analysis-client";
import { analysisKey, parseAnalysisRequest } from "../src/analysis-contract";

const request = parseAnalysisRequest({
  topic: "space",
  detail: "fan",
  language: "en",
  selected: "h9",
  time: 23,
});
const payload = {
  provider: "foundry-local",
  kind: "fact-curation",
  model: "test-model",
  contextKey: analysisKey(request),
  elapsedMs: 20,
  cached: false,
  answer: {
    title: "Space",
    body: "Vela receives the cutback.",
    evidence: [{ label: "Reception", time: 23 }],
    metric: "4.0",
    metricLabel: "metres",
  },
};
describe("analysis lifecycle", () => {
  it("discards an old response even when its transport ignores abort", async () => {
    let resolve!: (response: Response) => void;
    const transport = vi.fn(
      () =>
        new Promise<Response>((r) => {
          resolve = r;
        }),
    ) as unknown as typeof fetch;
    const client = new AnalysisClient(transport);
    const pending = client.request(request);
    client.invalidate();
    resolve(new Response(JSON.stringify(payload)));
    expect(await pending).toBeNull();
  });
  it("surfaces backend failure and rejects a mismatched context", async () => {
    const failure = new AnalysisClient(
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: "Model unavailable" }), {
            status: 503,
          }),
      ) as unknown as typeof fetch,
    );
    await expect(failure.request(request)).rejects.toThrow("Model unavailable");
    const mismatch = new AnalysisClient(
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ ...payload, contextKey: "old-request" }),
          ),
      ) as unknown as typeof fetch,
    );
    await expect(mismatch.request(request)).rejects.toThrow("invalid response");
  });
  it("triggers one recap per completed playback and rearms after rewind", () => {
    const trigger = new RecapTrigger();
    expect(trigger.update(29.9, true)).toBe(false);
    expect(trigger.update(30, true)).toBe(true);
    expect(trigger.update(30, false)).toBe(false);
    expect(trigger.update(30, true)).toBe(false);
    expect(trigger.update(12, false)).toBe(false);
    expect(trigger.update(30, false)).toBe(false);
    expect(trigger.update(30, true)).toBe(true);
  });
});
