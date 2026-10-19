import {
  analysisKey,
  type AnalysisRequest,
  type AnalysisResult,
} from "./analysis-contract";

export class AnalysisClient {
  private revision = 0;
  private controller?: AbortController;
  constructor(
    private transport: typeof fetch = (input, init) =>
      globalThis.fetch(input, init),
  ) {}
  invalidate() {
    this.revision++;
    this.controller?.abort();
    this.controller = undefined;
  }
  async request(request: AnalysisRequest): Promise<AnalysisResult | null> {
    this.invalidate();
    const revision = this.revision;
    const controller = new AbortController();
    this.controller = controller;
    const timer = setTimeout(() => controller.abort(), 50_000);
    try {
      const response = await this.transport("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
        signal: controller.signal,
      });
      const result = await response.json();
      if (revision !== this.revision) return null;
      if (!response.ok)
        throw new Error(
          typeof result.error === "string"
            ? result.error
            : "The local analyst is unavailable.",
        );
      const answer = result.answer;
      if (
        result.provider !== "foundry-local" ||
        result.kind !== "fact-curation" ||
        result.contextKey !== analysisKey(request) ||
        !answer ||
        ["title", "body", "metric", "metricLabel"].some(
          (key) => typeof answer[key] !== "string",
        ) ||
        !Array.isArray(answer.evidence) ||
        answer.evidence.length < 1 ||
        answer.evidence.length > 10 ||
        answer.evidence.some(
          (e: { label?: unknown; time?: unknown }) =>
            !e ||
            typeof e.label !== "string" ||
            typeof e.time !== "number" ||
            !Number.isFinite(e.time) ||
            e.time < 0 ||
            e.time > 30,
        ) ||
        typeof result.model !== "string" ||
        typeof result.cached !== "boolean" ||
        !Number.isFinite(result.elapsedMs) ||
        result.elapsedMs < 0
      )
        throw new Error("The local analyst returned an invalid response.");
      return result as AnalysisResult;
    } catch (error) {
      if (revision !== this.revision) return null;
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}

/** A completed playback fires once; any move below its end rearms it. */
export class RecapTrigger {
  private completed = false;
  update(time: number, wasPlaying: boolean) {
    if (time < 30) this.completed = false;
    if (time >= 30 && wasPlaying && !this.completed) {
      this.completed = true;
      return true;
    }
    return false;
  }
}
