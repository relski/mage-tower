import { describe, expect, it } from "vitest";
import type { TraceStep } from "../../core/types";
import {
  castDurationMs,
  castTimeline,
  DRAIN_MS,
  drainDamage,
  HOLD_MS,
  STEP_MAX_MS,
  STEP_MIN_MS,
  STEPS_TOTAL_MS,
} from "./cast-timeline";
import type { DrainFrame, StepFrame } from "./cast-timeline";

function trace(count: number): TraceStep[] {
  return Array.from({ length: count }, (_, index) => ({
    source: index === 0 ? "Channel" : `Card ${index}`,
    description: `step ${index}`,
    total: (index + 1) * 10,
  }));
}

describe("castTimeline", () => {
  it("has one frame per trace step, then the drain", () => {
    const frames = castTimeline(trace(3), 40, 130);

    expect(frames.map((frame) => frame.kind)).toEqual(["step", "step", "step", "drain"]);
  });

  it("carries each step's source, description and running total", () => {
    const [first, second] = castTimeline(trace(2), 0, 20) as [StepFrame, StepFrame, DrainFrame];

    expect(first).toMatchObject({ source: "Channel", description: "step 0", total: 10 });
    expect(second).toMatchObject({ source: "Card 1", description: "step 1", total: 20 });
  });

  it("drains from the damage before the cast to the damage after it", () => {
    const frames = castTimeline(trace(1), 40, 130);
    const drain = frames.at(-1) as DrainFrame;

    expect(drain).toMatchObject({ kind: "drain", from: 40, to: 130 });
    expect(drain.durationMs).toBe(DRAIN_MS);
    expect(drain.holdMs).toBe(HOLD_MS);
  });

  it("spreads the steps over about STEPS_TOTAL_MS", () => {
    const frames = castTimeline(trace(5), 0, 50);
    const step = frames[0] as StepFrame;

    expect(step.durationMs).toBe(STEPS_TOTAL_MS / 5);
  });

  it("never makes a step longer than STEP_MAX_MS or shorter than STEP_MIN_MS", () => {
    const few = castTimeline(trace(1), 0, 10)[0] as StepFrame;
    const many = castTimeline(trace(30), 0, 10)[0] as StepFrame;

    expect(few.durationMs).toBe(STEP_MAX_MS);
    expect(many.durationMs).toBe(STEP_MIN_MS);
  });

  it("still ends with the drain when the trace is empty", () => {
    const frames = castTimeline([], 0, 0);

    expect(frames).toHaveLength(1);
    expect(frames[0]?.kind).toBe("drain");
  });

  it("is a few seconds at most for a typical cast", () => {
    // 6 steps is more than most casts have
    expect(castDurationMs(castTimeline(trace(6), 0, 100))).toBeLessThan(3500);
  });
});

describe("castDurationMs", () => {
  it("adds up every frame, including the hold after the drain", () => {
    const frames = castTimeline(trace(2), 0, 20);
    const stepMs = (frames[0] as StepFrame).durationMs;

    expect(castDurationMs(frames)).toBe(stepMs * 2 + DRAIN_MS + HOLD_MS);
  });
});

describe("drainDamage", () => {
  const frame: DrainFrame = { kind: "drain", from: 40, to: 130, durationMs: 600, holdMs: 300 };

  it("starts at the damage before the cast and ends at the damage after it", () => {
    expect(drainDamage(frame, 0)).toBe(40);
    expect(drainDamage(frame, 1)).toBe(130);
  });

  it("only goes up, and moves fastest at the start", () => {
    const early = drainDamage(frame, 0.25) - drainDamage(frame, 0);
    const late = drainDamage(frame, 1) - drainDamage(frame, 0.75);

    expect(drainDamage(frame, 0.5)).toBeGreaterThan(drainDamage(frame, 0.25));
    expect(drainDamage(frame, 0.75)).toBeGreaterThan(drainDamage(frame, 0.5));
    expect(early).toBeGreaterThan(late);
  });

  it("stays between the two values for any progress", () => {
    expect(drainDamage(frame, -1)).toBe(40);
    expect(drainDamage(frame, 2)).toBe(130);
  });

  it("does not move when the cast did no damage", () => {
    expect(drainDamage({ ...frame, from: 60, to: 60 }, 0.5)).toBe(60);
  });
});
