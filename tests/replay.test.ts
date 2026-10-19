import { describe, expect, it } from "vitest";
import { players, events, DURATION } from "../src/match";
import {
  sampleMatch,
  playerAt,
  ballAt,
  ReplayClock,
  parseCommand,
  passMetrics,
  receptionSpace,
} from "../src/replay";
import { explain } from "../src/analyst";

describe("authored match integrity", () => {
  it("has two complete, uniquely identified teams with pitch-bounded trajectories", () => {
    expect(players).toHaveLength(22);
    expect(new Set(players.map((p) => p.id)).size).toBe(22);
    for (const team of ["home", "away"])
      expect(players.filter((p) => p.team === team)).toHaveLength(11);
    for (let t = 0; t <= DURATION; t += 0.25)
      for (const p of players) {
        const point = playerAt(p.id, t);
        expect(Math.abs(point.x)).toBeLessThanOrEqual(52.5);
        expect(Math.abs(point.z)).toBeLessThanOrEqual(34);
      }
    expect(events.map((e) => e.time)).toEqual(
      events.map((e) => e.time).sort((a, b) => a - b),
    );
  });
  it("produces the same complete state regardless of seek history", () => {
    const expected = sampleMatch(23);
    sampleMatch(30);
    sampleMatch(0);
    sampleMatch(12);
    expect(sampleMatch(23)).toEqual(expected);
    expect(sampleMatch(12).events.every((e) => e.time <= 12)).toBe(true);
    expect(sampleMatch(30).score).toEqual([2, 1]);
    expect(sampleMatch(0).score).toEqual([1, 1]);
    expect(sampleMatch(12).passesCompleted).toBe(1);
    expect(sampleMatch(23).passesCompleted).toBe(3);
    expect(sampleMatch(22).possessor).toBeNull();
    expect(sampleMatch(23).possessor).toBe("h9");
  });
  it("keeps the ball continuous at every possession and flight boundary", () => {
    for (const t of [4, 6.5, 11.5, 14.5, 21.5, 23, 24, 25.1, 26.2]) {
      const a = ballAt(t - 0.0001),
        b = ballAt(t + 0.0001);
      expect(Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)).toBeLessThan(0.02);
    }
    const receiver = playerAt("h9", 23);
    expect(ballAt(23).x).toBeCloseTo(receiver.x);
    expect(ballAt(23).z).toBeCloseTo(receiver.z);
  });
  it("derives explanation metrics from trajectories, never a hard-coded claim", () => {
    const pass = passMetrics("assist");
    const a = playerAt("h7", 21.5),
      b = playerAt("h9", 23);
    expect(pass.distance).toBeCloseTo(Math.hypot(b.x - a.x, b.z - a.z));
    expect(pass.speedKph).toBeCloseTo((pass.distance / 1.5) * 3.6);
    expect(receptionSpace().distance).toBeGreaterThan(0);
    const answer = explain("space", "analyst", "en", "h9", 23);
    expect(answer.evidence.length).toBeGreaterThan(0);
    expect(answer.body).toContain(receptionSpace().distance.toFixed(1));
    expect(explain("space", "fan", "es", "h9", 23).body).not.toEqual(
      answer.body,
    );
    const contextual = explain("space", "analyst", "en", "h7", 20.5);
    expect(contextual.title).toContain("Luca Reed");
    expect(contextual.body).toContain("does not establish");
    expect(contextual.evidence[0].time).toBe(20.5);
  });
});

describe("clock and input boundaries", () => {
  it("freezes, clamps, slows down, and stops at the end", () => {
    const clock = new ReplayClock();
    clock.seek(10);
    clock.tick(2);
    expect(clock.time).toBe(10);
    clock.playing = true;
    clock.speed = 0.5;
    clock.tick(2);
    expect(clock.time).toBe(11);
    clock.seek(-5);
    expect(clock.time).toBe(0);
    clock.seek(100);
    expect(clock.time).toBe(30);
    clock.playing = true;
    clock.tick(1);
    expect(clock.playing).toBe(false);
    clock.seek(Number.NaN);
    expect(clock.time).toBe(30);
  });
  it("recognises supported commands without interpreting arbitrary text as an action", () => {
    expect(parseCommand("back three seconds")).toEqual({
      type: "seek-relative",
      seconds: -3,
    });
    expect(parseCommand("freeze")).toEqual({ type: "pause" });
    expect(parseCommand("rewind to before the pass")).toEqual({
      type: "before-pass",
    });
    expect(parseCommand("clear everything. play.")).toEqual({
      type: "clear-play",
    });
    expect(parseCommand("why was he free?")).toEqual({
      type: "explain",
      topic: "space",
    });
    expect(parseCommand("<script>alert(1)</script>")).toEqual({
      type: "unknown",
    });
    expect(parseCommand("freeze the account")).toEqual({ type: "unknown" });
  });
});
