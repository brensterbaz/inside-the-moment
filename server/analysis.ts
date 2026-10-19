import {
  parseAnalysisRequest,
  type AnalysisResult,
} from "../src/analysis-contract";
import {
  buildAnalysisContext,
  type AnalysisContext,
} from "../src/analysis-context";
import type { Answer } from "../src/analyst";

export type Generation = { text: string; model: string; elapsedMs: number };
export type Generate = (
  system: string,
  prompt: string,
  signal?: AbortSignal,
) => Promise<Generation>;

export function analysisPrompt(context: AnalysisContext) {
  const { request } = context;
  return {
    system:
      'You select verified facts for a football replay explanation. Return ONLY a JSON object with exactly one field: factIds, an array of supplied statement IDs. Example: {"factIds":["f0","f1"]}. Never write a title, body, explanation or new fact. Do not invent IDs. The application renders the selected statements verbatim with recorded metrics and timestamps.',
    prompt: `Question topic: ${request.topic}. Audience: ${request.detail}. Language: ${request.language}.\n${request.topic === "recap" ? "Choose 4–6 key events to summarise the whole sequence." : request.detail === "fan" ? "Choose exactly 2 statements, making the explanation clear for a casual fan." : "Choose 3–5 statements, including the measurement and its limitation."}\nStatements: ${JSON.stringify(context.statements.map(({ id, text }) => ({ id, text })))}\nYou MUST include these IDs: ${context.requiredFactIds.join(", ")}.\nReturn only {"factIds":[...]} with your selected IDs.`,
  };
}

export function validateGeneration(
  text: string,
  context: AnalysisContext,
): Answer {
  // Tolerate only a surrounding JSON fence, not commentary or a second object.
  const raw: unknown = JSON.parse(
    text
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, ""),
  );
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new Error("Invalid model output.");
  const v = raw as Record<string, unknown>;
  const ids: unknown[] = Array.isArray(v.factIds) ? v.factIds : [];
  const minimum = Math.min(
    context.statements.length,
    context.request.detail === "analyst" || context.request.topic === "recap"
      ? 3
      : 2,
  );
  const maximum = Math.min(
    context.statements.length,
    context.request.topic === "recap"
      ? 6
      : context.request.detail === "fan"
        ? 2
        : 5,
  );
  if (
    Object.keys(v).join(",") !== "factIds" ||
    !Array.isArray(v.factIds) ||
    v.factIds.length < 1 ||
    v.factIds.length > context.statements.length ||
    new Set(v.factIds).size !== v.factIds.length ||
    v.factIds.some(
      (id) =>
        typeof id !== "string" || !context.statements.some((f) => f.id === id),
    ) ||
    ids.some((id) => typeof id !== "string")
  )
    throw new Error(
      "The model returned an unsupported claim or invalid fact selection.",
    );
  // Required measurements/limitations are application policy, not something a model may omit.
  const selectedIds = [
    ...new Set([...context.requiredFactIds, ...ids]),
  ] as string[];
  for (const fact of context.statements)
    if (selectedIds.length < minimum && !selectedIds.includes(fact.id))
      selectedIds.push(fact.id);
  const selected = context.statements.filter((f) =>
    selectedIds.slice(0, maximum).includes(f.id),
  );
  const evidence = [
    ...new Map(
      selected
        .flatMap((f) => f.evidence)
        .map((e) => [`${e.time}:${e.label}`, e]),
    ).values(),
  ];
  return {
    ...context.baseline,
    body: selected.map((f) => f.text).join(" "),
    evidence,
  };
}

export class AnalysisService {
  private cache = new Map<string, AnalysisResult>();
  private busy = false;
  constructor(private generate: Generate) {}
  async analyse(value: unknown, signal?: AbortSignal): Promise<AnalysisResult> {
    const request = parseAnalysisRequest(value);
    const context = buildAnalysisContext(request);
    const cached = this.cache.get(context.key);
    if (cached) return { ...cached, cached: true };
    if (this.busy) throw new Error("BUSY");
    this.busy = true;
    try {
      const prompt = analysisPrompt(context);
      const generation = await this.generate(
        prompt.system,
        prompt.prompt,
        signal,
      );
      if (signal?.aborted) throw new Error("Analysis cancelled.");
      let answer: Answer;
      try {
        answer = validateGeneration(generation.text, context);
      } catch (error) {
        console.warn(
          "Rejected local fact selection:",
          generation.text.slice(0, 200),
        );
        throw error;
      }
      const result: AnalysisResult = {
        answer,
        provider: "foundry-local",
        kind: "fact-curation",
        model: generation.model,
        elapsedMs: generation.elapsedMs,
        cached: false,
        contextKey: context.key,
      };
      if (this.cache.size >= 128)
        this.cache.delete(this.cache.keys().next().value!);
      this.cache.set(context.key, result);
      return result;
    } finally {
      this.busy = false;
    }
  }
}
