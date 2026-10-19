import { players, DURATION } from "./match";
import type { Detail, Language, Answer } from "./analyst";
import type { Topic } from "./replay";

export type AnalysisRequest = {
  topic: Topic;
  detail: Detail;
  language: Language;
  selected: string;
  time: number;
};
export type AnalysisResult = {
  answer: Answer;
  provider: "foundry-local";
  kind: "fact-curation";
  model: string;
  elapsedMs: number;
  cached: boolean;
  contextKey: string;
};
export const MATCH_VERSION = "northbank-eastford-30s-v1";

export function parseAnalysisRequest(value: unknown): AnalysisRequest {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Expected an analysis request.");
  const v = value as Record<string, unknown>;
  const keys = ["topic", "detail", "language", "selected", "time"];
  if (
    Object.keys(v).length !== keys.length ||
    Object.keys(v).some((k) => !keys.includes(k)) ||
    !["space", "pass", "player", "recap"].includes(String(v.topic)) ||
    !["fan", "analyst"].includes(String(v.detail)) ||
    !["en", "es"].includes(String(v.language)) ||
    typeof v.selected !== "string" ||
    !players.some((p) => p.id === v.selected) ||
    typeof v.time !== "number" ||
    !Number.isFinite(v.time) ||
    v.time < 0 ||
    v.time > DURATION
  ) {
    throw new Error(
      "Invalid topic, preferences, recorded player or replay time.",
    );
  }
  return {
    topic: v.topic as Topic,
    detail: v.detail as Detail,
    language: v.language as Language,
    selected: v.selected,
    time: Math.round(v.time * 20) / 20,
  };
}

export function analysisKey(request: AnalysisRequest) {
  return JSON.stringify([
    MATCH_VERSION,
    request.topic,
    request.detail,
    request.language,
    request.selected,
    request.time,
  ]);
}
