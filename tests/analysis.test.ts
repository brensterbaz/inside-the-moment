import { describe, expect, it, vi } from "vitest";
import { parseAnalysisRequest } from "../src/analysis-contract";
import { buildAnalysisContext } from "../src/analysis-context";
import { AnalysisService, validateGeneration } from "../server/analysis";

const request = {
  topic: "space",
  detail: "fan",
  language: "en",
  selected: "h9",
  time: 23,
};
describe("local analysis evidence boundary", () => {
  it("rejects unknown players, non-finite times, extra fields and unsupported preferences", () => {
    for (const change of [
      { selected: "unknown" },
      { time: NaN },
      { time: 31 },
      { language: "xx" },
      { endpoint: "https://example.com" },
    ]) {
      expect(() => parseAnalysisRequest({ ...request, ...change })).toThrow();
    }
  });
  it("preserves recorded evidence times and derives the metric from the match", () => {
    const context = buildAnalysisContext(parseAnalysisRequest(request));
    expect(context.baseline.evidence.map((e) => e.time)).toEqual([18, 23]);
    expect(Number(context.baseline.metric)).toBeGreaterThan(0);
    const answer = validateGeneration(
      JSON.stringify({ factIds: ["f0", "f1"] }),
      context,
    );
    expect(answer.metric).toBe(context.baseline.metric);
    expect(answer.evidence).toEqual(context.baseline.evidence);
  });
  it("rejects invented facts, arbitrary narrative/statistics and missing required evidence", () => {
    const context = buildAnalysisContext(parseAnalysisRequest(request));
    for (const output of [
      {
        title: "Space",
        body: "Vela is 999 metres clear.",
        evidenceIds: ["e0"],
      },
      {
        title: "Space",
        body: "Vela receives the pass.",
        evidenceIds: ["invented"],
      },
      { title: "Space", body: "Expected goals is 0.94.", evidenceIds: ["e0"] },
      { factIds: ["invented", "f1"] },
      { factIds: ["f1", "f1"] },
    ])
      expect(() =>
        validateGeneration(JSON.stringify(output), context),
      ).toThrow();
  });
  it("adds the required metric and limitation when a model omits them", () => {
    const context = buildAnalysisContext(
      parseAnalysisRequest({ ...request, detail: "analyst" }),
    );
    const answer = validateGeneration(
      JSON.stringify({ factIds: ["f0"] }),
      context,
    );
    expect(answer.body).toContain(context.baseline.metric);
    expect(answer.body).toContain("not the defender’s intent");
  });
  it("validates before generation and caches only identical evidence/preferences", async () => {
    const generate = vi.fn(async (_system: string, prompt: string) => ({
      text: JSON.stringify({
        factIds: prompt.includes("Audience: analyst")
          ? ["f0", "f1", "f3"]
          : ["f0", "f1"],
      }),
      model: "real-model-id",
      elapsedMs: 50,
    }));
    const service = new AnalysisService(generate);
    await expect(
      service.analyse({ ...request, selected: "unknown" }),
    ).rejects.toThrow();
    expect(generate).not.toHaveBeenCalled();
    expect((await service.analyse(request)).cached).toBe(false);
    expect((await service.analyse(request)).cached).toBe(true);
    expect(generate).toHaveBeenCalledTimes(1);
    await service.analyse({ ...request, detail: "analyst" });
    expect(generate).toHaveBeenCalledTimes(2);
  });
  it("does not cache failure and rejects overlapping native requests", async () => {
    let finish!: () => void;
    const generate = vi.fn(async () => {
      await new Promise<void>((resolve) => {
        finish = resolve;
      });
      throw new Error("native failure");
    });
    const service = new AnalysisService(generate);
    const pending = service.analyse(request);
    await expect(service.analyse(request)).rejects.toThrow("BUSY");
    finish();
    await expect(pending).rejects.toThrow("native failure");
    const next = service.analyse(request);
    expect(generate).toHaveBeenCalledTimes(2);
    finish();
    await expect(next).rejects.toThrow("native failure");
  });
  it("renders changed records verbatim instead of trusting a model-written statistic", () => {
    const context = buildAnalysisContext(parseAnalysisRequest(request));
    const changed = {
      ...context,
      baseline: { ...context.baseline, metric: "99.9" },
      statements: context.statements.map((f) =>
        f.id === "f1" ? { ...f, text: "The recorded gap is 99.9m." } : f,
      ),
    };
    const output = JSON.stringify({ factIds: ["f0", "f1"] });
    expect(validateGeneration(output, context).metric).toBe(
      context.baseline.metric,
    );
    expect(validateGeneration(output, changed).metric).toBe("99.9");
    expect(validateGeneration(output, changed).body).toContain("99.9m");
  });
  it("rebuilds recap statements and exact citations from the event stream", () => {
    const context = buildAnalysisContext(
      parseAnalysisRequest({ ...request, topic: "recap", time: 30 }),
    );
    const answer = validateGeneration(
      JSON.stringify({ factIds: ["f0", "f2", "f4", "f5"] }),
      context,
    );
    expect(answer.body).toContain("Luca Reed passes to Mateo Vela");
    expect(answer.evidence.map((e) => e.time)).toEqual([0, 11.5, 21.5, 25.1]);
    expect(answer.metric).toBe("3");
  });
});
