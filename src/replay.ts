import { DURATION, players, events, type Point } from "./match";
export const clamp = (n: number, a: number, b: number) =>
  Math.min(b, Math.max(a, n));
export const distance = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, a.z - b.z);
export function playerAt(id: string, time: number): Point {
  const player = players.find((p) => p.id === id);
  if (!player) throw new Error(`Unknown player: ${id}`);
  const t = clamp(Number.isFinite(time) ? time : 0, 0, DURATION);
  const path = player.path;
  const next = path.findIndex((p) => p.time >= t);
  if (next <= 0) return { x: path[0].x, z: path[0].z };
  const a = path[next - 1],
    b = path[next],
    ratio = (t - a.time) / (b.time - a.time);
  return { x: a.x + (b.x - a.x) * ratio, z: a.z + (b.z - a.z) * ratio };
}
export function ballAt(time: number): Point & { y: number } {
  const t = clamp(Number.isFinite(time) ? time : 0, 0, DURATION);
  const carry = (id: string) => ({ ...playerAt(id, t), y: 0.22 });
  for (const e of events.filter(
    (e) => e.type === "pass" || e.type === "shot",
  )) {
    if (t >= e.time && t < e.end!) {
      const start = playerAt(e.player, e.time);
      const end = e.receiver
        ? playerAt(e.receiver, e.end!)
        : { x: 53.1, z: -2.6 };
      const r = (t - e.time) / (e.end! - e.time);
      return {
        x: start.x + (end.x - start.x) * r,
        z: start.z + (end.z - start.z) * r,
        y: 0.22 + Math.sin(r * Math.PI) * (e.type === "shot" ? 0.75 : 0.38),
      };
    }
  }
  if (t < 4) return carry("h6");
  if (t < 11.5) return carry("h8");
  if (t < 21.5) return carry("h7");
  if (t < 24) return carry("h9");
  const r = clamp((t - 25.1) / 1.1, 0, 1);
  return { x: 53.1 + r * 0.8, z: -2.6 + r * 0.2, y: 0.22 };
}
export function playerSpeed(id: string, time: number) {
  const a = clamp(time - 0.05, 0, DURATION),
    b = clamp(time + 0.05, 0, DURATION);
  return b === a
    ? 0
    : (distance(playerAt(id, a), playerAt(id, b)) / (b - a)) * 3.6;
}
export function passMetrics(id: string) {
  const e = events.find((e) => e.id === id);
  if (!e?.receiver || e.end === undefined)
    throw new Error("A completed pass record is required");
  const length = distance(
    playerAt(e.player, e.time),
    playerAt(e.receiver, e.end),
  );
  return {
    distance: length,
    speedKph: (length / (e.end - e.time)) * 3.6,
    duration: e.end - e.time,
  };
}
export function receptionSpace() {
  const receiver = playerAt("h9", 23);
  return players
    .filter((p) => p.team === "away" && p.role !== "Goalkeeper")
    .map((p) => ({
      player: p,
      distance: distance(receiver, playerAt(p.id, 23)),
    }))
    .sort((a, b) => a.distance - b.distance)[0];
}
export function sampleMatch(time: number) {
  const t = clamp(Number.isFinite(time) ? time : 0, 0, DURATION);
  const currentEvents = events.filter((e) => e.time <= t);
  const inFlight = events.some(
    (e) =>
      (e.type === "pass" || e.type === "shot") && t >= e.time && t < e.end!,
  );
  return {
    time: t,
    players: players.map((p) => ({ id: p.id, ...playerAt(p.id, t) })),
    ball: ballAt(t),
    events: currentEvents,
    score: (t >= 25.1 ? [2, 1] : [1, 1]) as [number, number],
    possessor:
      inFlight || t >= 24
        ? null
        : t < 4
          ? "h6"
          : t < 11.5
            ? "h8"
            : t < 21.5
              ? "h7"
              : "h9",
    passesCompleted: events.filter((e) => e.type === "pass" && e.end! <= t)
      .length,
    currentEvent: currentEvents[currentEvents.length - 1],
  };
}
export class ReplayClock {
  time = 18;
  playing = false;
  speed = 1;
  seek(time: number) {
    if (Number.isFinite(time)) this.time = clamp(time, 0, DURATION);
  }
  tick(seconds: number) {
    if (!this.playing || !Number.isFinite(seconds) || seconds < 0) return;
    this.seek(this.time + seconds * this.speed);
    if (this.time >= DURATION) this.playing = false;
  }
  toggle() {
    if (this.time >= DURATION) this.seek(0);
    this.playing = !this.playing;
  }
}
export type Topic = "space" | "pass" | "recap" | "player";
export type Command =
  | {
      type:
        | "pause"
        | "play"
        | "before-pass"
        | "clear-play"
        | "unknown"
        | "slow"
        | "seat"
        | "undo"
        | "keeper"
        | "better-angle"
        | "confirm"
        | "cancel";
    }
  | { type: "seek-relative"; seconds: number }
  | { type: "explain"; topic: Topic };
export function parseCommand(input: string): Command {
  const s = input
    .toLowerCase()
    .trim()
    .replace(/[.!?]/g, "")
    .replace(/\s+/g, " ");
  if (["freeze", "pause", "stop"].includes(s)) return { type: "pause" };
  if (["play", "resume"].includes(s)) return { type: "play" };
  if (["clear everything play", "clear and play"].includes(s))
    return { type: "clear-play" };
  if (["slow it down", "slow down"].includes(s)) return { type: "slow" };
  if (
    [
      "rewind to before the pass",
      "before the pass",
      "rewind before the pass",
    ].includes(s)
  )
    return { type: "before-pass" };
  if (["a little further back", "back three seconds"].includes(s))
    return { type: "seek-relative", seconds: -3 };
  const seek = s.match(/^(?:back|rewind) (\d{1,2}) seconds?$/);
  if (seek) return { type: "seek-relative", seconds: -Number(seek[1]) };
  if (
    [
      "why was he free",
      "why was vela free",
      "why was the striker free",
      "explain the space",
    ].includes(s)
  )
    return { type: "explain", topic: "space" };
  if (
    [
      "show me that passing lane",
      "show passing lane",
      "explain the pass",
    ].includes(s)
  )
    return { type: "explain", topic: "pass" };
  if (["recap", "summarise the moment", "summarize the moment"].includes(s))
    return { type: "explain", topic: "recap" };
  if (["explain this player", "tell me about him"].includes(s))
    return { type: "explain", topic: "player" };
  if (["return to seat", "back to my seat"].includes(s))
    return { type: "seat" };
  if (["undo move", "undo"].includes(s)) return { type: "undo" };
  if (["show me what the keeper could see", "keeper view"].includes(s))
    return { type: "keeper" };
  if (["give me a better angle", "better angle"].includes(s))
    return { type: "better-angle" };
  if (["confirm", "move me there"].includes(s)) return { type: "confirm" };
  if (["cancel", "cancel move"].includes(s)) return { type: "cancel" };
  return { type: "unknown" };
}
