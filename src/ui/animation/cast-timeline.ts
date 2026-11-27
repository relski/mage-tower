import type { TraceStep } from "../../core/types";

// The cast animation as a list of frames, built from a cast's trace. This file only decides
// what is shown and for how long; cast-playback.ts runs the frames and app.ts draws them.
// Keeping it free of the browser makes the timing testable.

export type StepFrame = {
  kind: "step",
  source: string,
  description: string,
  total: number, // the running damage total after this step
  durationMs: number,
};

export type DrainFrame = {
  kind: "drain",
  from: number, // the stage's total damage before the cast
  to: number, // and after it
  durationMs: number, // how long the HP meter takes to drain
  holdMs: number, // how long the finished result stays before the animation ends
};

export type CastFrame = StepFrame | DrainFrame;

// all the trace steps together take about this long, whatever their number...
export const STEPS_TOTAL_MS = 2000;
// ...but one step is never shorter or longer than this
export const STEP_MIN_MS = 220;
export const STEP_MAX_MS = 420;

export const DRAIN_MS = 600;
export const HOLD_MS = 300;

// One frame per trace step (the channel's power, then each card that changed the total),
// then the frame where the enemy's HP drains by the damage dealt.
export function castTimeline(
  trace: readonly TraceStep[],
  damageBefore: number,
  damageAfter: number,
): CastFrame[] {
  const stepMs = Math.min(
    STEP_MAX_MS,
    Math.max(STEP_MIN_MS, STEPS_TOTAL_MS / Math.max(trace.length, 1)),
  );

  const steps: StepFrame[] = trace.map((step) => ({
    kind: "step",
    source: step.source,
    description: step.description,
    total: step.total,
    durationMs: stepMs,
  }));

  return [
    ...steps,
    { kind: "drain", from: damageBefore, to: damageAfter, durationMs: DRAIN_MS, holdMs: HOLD_MS },
  ];
}

// how long the whole animation takes if nobody skips it
export function castDurationMs(frames: readonly CastFrame[]): number {
  return frames.reduce(
    (total, frame) =>
      total + frame.durationMs + (frame.kind === "drain" ? frame.holdMs : 0),
    0,
  );
}

// the stage's total damage while the meter drains: it moves fast at first and settles
// (progress goes from 0 to 1)
export function drainDamage(frame: DrainFrame, progress: number): number {
  const clamped = Math.min(1, Math.max(0, progress));
  const eased = 1 - (1 - clamped) ** 3;

  return frame.from + (frame.to - frame.from) * eased;
}
