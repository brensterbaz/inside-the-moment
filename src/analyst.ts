import { players } from "./match";
import {
  passMetrics,
  playerAt,
  playerSpeed,
  receptionSpace,
  distance,
  type Topic,
} from "./replay";
export type Detail = "fan" | "analyst";
export type Language = "en" | "es";
export type Answer = {
  title: string;
  body: string;
  evidence: { label: string; time: number }[];
  metric: string;
  metricLabel: string;
};
// Deterministic local adapter. Future cloud providers must return the same evidence-bearing shape.
export function explain(
  topic: Topic,
  mode: Detail,
  lang: Language,
  selected: string,
  time: number,
): Answer {
  const es = lang === "es",
    detailed = mode === "analyst";
  const gap = receptionSpace(),
    pass = passMetrics("assist");
  const p = players.find((p) => p.id === selected)!;
  if (topic === "space" && selected !== "h9") {
    const point = playerAt(selected, time);
    const nearest = players
      .filter((other) => other.team !== p.team && other.role !== "Goalkeeper")
      .map((other) => ({
        player: other,
        gap: distance(point, playerAt(other.id, time)),
      }))
      .sort((a, b) => a.gap - b.gap)[0];
    return {
      title: es ? `El espacio de ${p.name}` : `${p.name}’s space`,
      body: es
        ? `A los ${time.toFixed(1)} s, ${p.name} está a ${nearest.gap.toFixed(1)} m del rival de campo más cercano, ${nearest.player.name}. Esta separación no demuestra por sí sola que esté libre.${detailed ? " Se calcula entre posiciones de las trayectorias sintéticas; no incluye la orientación del cuerpo ni una probabilidad de pase." : ""}`
        : `At ${time.toFixed(1)}s, ${p.name} is ${nearest.gap.toFixed(1)}m from the nearest opposing outfield player, ${nearest.player.name}. That separation alone does not establish that the player is free.${detailed ? " It is calculated from the synthetic trajectories; it does not account for body orientation or pass probability." : ""}`,
      evidence: [
        { label: es ? "Posiciones comparadas" : "Compare positions", time },
      ],
      metric: nearest.gap.toFixed(1),
      metricLabel: es ? "m al rival" : "metres to opponent",
    };
  }
  if (topic === "player") {
    const travelled = distance(playerAt(selected, 0), playerAt(selected, time));
    return {
      title: p.name,
      body: es
        ? `${p.name} lleva el dorsal ${p.number}. A los ${time.toFixed(1)} s, su velocidad calculada es ${playerSpeed(selected, time).toFixed(1)} km/h.${detailed ? ` Su desplazamiento desde el inicio es de ${travelled.toFixed(1)} m (no es la distancia total recorrida).` : ""}`
        : `${p.name} wears number ${p.number}. At ${time.toFixed(1)}s, the authored movement gives a speed of ${playerSpeed(selected, time).toFixed(1)} km/h.${detailed ? ` Displacement from the starting position is ${travelled.toFixed(1)}m, not total distance travelled.` : ""}`,
      evidence: [
        { label: es ? "Posición seleccionada" : "Selected position", time },
      ],
      metric: playerSpeed(selected, time).toFixed(1),
      metricLabel: "km/h",
    };
  }
  if (topic === "pass")
    return {
      title: es ? "El pase que abre la defensa" : "The pass that opens it up",
      body: es
        ? `Reed devuelve el balón hacia Vela en vez de seguir hacia la línea de fondo. El pase recorre ${pass.distance.toFixed(1)} m en ${pass.duration.toFixed(1)} s.${detailed ? ` Velocidad horizontal media: ${pass.speedKph.toFixed(1)} km/h, calculada entre salida y recepción. La línea muestra ambos puntos registrados.` : " Vela llega al espacio central para rematar."}`
        : `Reed cuts the ball back to Vela instead of continuing towards the byline. The pass travels ${pass.distance.toFixed(1)}m in ${pass.duration.toFixed(1)} seconds.${detailed ? ` Mean horizontal speed: ${pass.speedKph.toFixed(1)} km/h, derived from the release and reception positions. The lane joins those recorded points.` : " Vela arrives in the central space to finish."}`,
      evidence: [
        { label: es ? "Salida del pase" : "Pass released", time: 21.5 },
        { label: es ? "Recepción" : "Reception", time: 23 },
      ],
      metric: pass.distance.toFixed(1),
      metricLabel: es ? "m de pase" : "metre pass",
    };
  if (topic === "recap")
    return {
      title: es
        ? "Treinta segundos. Un cambio decisivo."
        : "Thirty seconds. A new lead.",
      body: es
        ? "Moreau recupera, Costa cambia el juego y Reed avanza por la derecha. Vela se mueve al espacio, recibe el pase atrás y marca. Northbank pasa del 1–1 al 2–1. Este resumen incluye el desenlace de toda la secuencia sintética."
        : "Moreau recovers, Costa switches play and Reed advances down the right. Vela moves into the space, receives the cutback and finishes. Northbank turn 1–1 into 2–1. This recap includes the outcome of the complete synthetic sequence.",
      evidence: [
        { label: es ? "Recuperación" : "Recovery", time: 0 },
        { label: es ? "Cambio de juego" : "Switch of play", time: 11.5 },
        { label: es ? "Gol" : "Goal", time: 25.1 },
      ],
      metric: "3",
      metricLabel: es ? "pases completados" : "completed passes",
    };
  return {
    title: es
      ? "El espacio está en el movimiento."
      : "The space is in the movement.",
    body: es
      ? `Reed lleva el balón hacia la derecha mientras Vela curva su carrera hacia el centro. Al recibir, el defensor de campo más cercano está a ${gap.distance.toFixed(1)} m.${detailed ? ` Es ${gap.player.name}; la distancia se calcula a los 23,0 s entre ambos puntos. Las trayectorias muestran la separación, no prueban la intención del defensor.` : " Ese espacio le permite preparar el remate. Las posiciones son de nuestra secuencia sintética."}`
      : `Reed draws the play to the right while Vela curves his run back into the middle. At reception, the nearest outfield defender is ${gap.distance.toFixed(1)}m away.${detailed ? ` That is ${gap.player.name}; the gap is measured between their positions at 23.0s. The trajectories show separation, not the defender’s intent.` : " That space gives him room to set up the finish. These positions come from our synthetic sequence."}`,
    evidence: [
      { label: es ? "Inicio de la carrera" : "The run begins", time: 18 },
      { label: es ? "Espacio al recibir" : "Space at reception", time: 23 },
    ],
    metric: gap.distance.toFixed(1),
    metricLabel: es ? "m al defensor" : "metres of separation",
  };
}
