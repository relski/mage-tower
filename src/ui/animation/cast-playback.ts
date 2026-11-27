import type { CastFrame, DrainFrame, StepFrame } from "./cast-timeline";

// Runs the frames of a cast animation one after another. It knows nothing about the page:
// the handlers draw each frame. It can be skipped, and then it finishes at once.

export type PlaybackHandlers = {
  onStep: (frame: StepFrame) => void, // a trace step starts
  onDrainStart: (frame: DrainFrame) => void, // the HP drain starts
  onDrain: (frame: DrainFrame, progress: number) => void, // each animation frame of the drain, 0 to 1
  onDone: () => void, // after the last frame, or right away when skipped (called once)
};

export type CastPlayback = {
  skip: () => void,
};

export function playCast(frames: readonly CastFrame[], handlers: PlaybackHandlers): CastPlayback {
  let index = 0;
  let timer: number | null = null;
  let animationFrame: number | null = null;
  let finished = false;

  const finish = (): void => {
    if (finished) {
      return;
    }

    finished = true;

    if (timer !== null) {
      window.clearTimeout(timer);
    }

    if (animationFrame !== null) {
      window.cancelAnimationFrame(animationFrame);
    }

    handlers.onDone();
  };

  const next = (): void => {
    timer = null;

    const frame = frames[index];
    index += 1;

    if (frame === undefined) {
      finish();
      return;
    }

    if (frame.kind === "step") {
      handlers.onStep(frame);
      timer = window.setTimeout(next, frame.durationMs);
      return;
    }

    handlers.onDrainStart(frame);

    const startedAt = performance.now();

    const tick = (now: number): void => {
      const progress = Math.min(1, (now - startedAt) / frame.durationMs);

      handlers.onDrain(frame, progress);

      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(tick);
      } else {
        animationFrame = null;
        timer = window.setTimeout(next, frame.holdMs);
      }
    };

    animationFrame = window.requestAnimationFrame(tick);
  };

  next();

  return { skip: finish };
}
