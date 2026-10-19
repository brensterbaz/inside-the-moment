import { explain } from "./analyst";
import { players, teams, events, MATCH_START } from "./match";
import { playerAt, sampleMatch, passMetrics } from "./replay";
import { analysisKey, type AnalysisRequest } from "./analysis-contract";

export function buildAnalysisContext(request: AnalysisRequest) {
  const baseline = explain(
    request.topic,
    request.detail,
    request.language,
    request.selected,
    request.time,
  );
  if (request.topic === "recap")
    baseline.metric = String(sampleMatch(30).passesCompleted);
  const player = players.find((p) => p.id === request.selected)!;
  const citations = baseline.evidence.map((e, i) => ({ id: `e${i}`, ...e }));
  // Facts are rendered by the application. The model selects relevance; it cannot invent prose.
  const sentences = baseline.body.split(/(?<=[.!?])\s+/).filter(Boolean);
  let statementEvidence = sentences.map(() => baseline.evidence);
  if (request.topic === "recap") {
    const name = (id: string) => players.find((p) => p.id === id)!.name;
    const es = request.language === "es";
    const recap = events.filter((e) =>
      ["recovery", "pass", "run", "goal"].includes(e.type),
    );
    sentences.splice(
      0,
      sentences.length,
      ...recap.map((event) => {
        const who = name(event.player);
        if (event.type === "recovery")
          return es
            ? `${who} recupera la posesión.`
            : `${who} regains possession.`;
        if (event.type === "pass") {
          const receiver = name(event.receiver!);
          if (request.detail === "analyst") {
            const metric = passMetrics(event.id);
            return es
              ? `${who} pasa el balón a ${receiver}: ${metric.distance.toFixed(1)} m en ${metric.duration.toFixed(1)} s.`
              : `${who} passes to ${receiver}: ${metric.distance.toFixed(1)}m in ${metric.duration.toFixed(1)}s.`;
          }
          return es
            ? `${who} pasa el balón a ${receiver}.`
            : `${who} passes to ${receiver}.`;
        }
        if (event.type === "run")
          return es
            ? `${who} inicia la carrera registrada a los ${event.time.toFixed(1)} s.`
            : `${who} begins the recorded run at ${event.time.toFixed(1)}s.`;
        const [home, away] = sampleMatch(event.time).score;
        return es
          ? `${who} marca: ${teams.home} se adelanta ${home}–${away}. El resumen cubre toda la secuencia sintética.`
          : `${who} scores: ${teams.home} take a ${home}–${away} lead. This recap covers the full synthetic sequence.`;
      }),
    );
    statementEvidence = recap.map((event) => [
      { label: es ? `Evento: ${event.label}` : event.label, time: event.time },
    ]);
  }
  const statements = sentences.map((text, i) => ({
    id: `f${i}`,
    text,
    evidence: statementEvidence[i],
  }));
  const metricIndex = sentences.findIndex((text) =>
    text.includes(baseline.metric),
  );
  const requiredFactIds =
    request.topic === "recap"
      ? ["f0", `f${sentences.length - 2}`, `f${sentences.length - 1}`]
      : [
          statements[Math.max(0, metricIndex)].id,
          ...(request.detail === "analyst"
            ? [statements[statements.length - 1].id]
            : []),
        ];
  return {
    key: analysisKey(request),
    request,
    baseline,
    facts: {
      synthetic: true,
      teams,
      selectedPlayer: {
        id: player.id,
        name: player.name,
        role: player.role,
        number: player.number,
      },
      scope:
        request.topic === "recap"
          ? "Entire synthetic sequence, 0–30 seconds, including its final goal."
          : request.topic === "player" ||
              (request.topic === "space" && player.id !== "h9")
            ? `Selected player at ${request.time.toFixed(1)} seconds.`
            : "Featured run and cutback, at the supplied evidence timestamps; not a live prediction.",
      matchStartSeconds: MATCH_START,
      verifiedExplanation: baseline.body,
      statements,
      recordedMetric: { value: baseline.metric, label: baseline.metricLabel },
      evidence: citations.map((e) => ({
        ...e,
        selectedPosition: playerAt(player.id, e.time),
        score: sampleMatch(e.time).score,
        events: events
          .filter((event) => event.time === e.time)
          .map((event) => ({ id: event.id, description: event.detail })),
      })),
      limits:
        "Authored positions cannot prove player intent, body orientation, pass probability, expected goals or unseen earlier match events.",
    },
    citations,
    statements,
    requiredFactIds: [...new Set(requiredFactIds)],
  };
}
export type AnalysisContext = ReturnType<typeof buildAnalysisContext>;
