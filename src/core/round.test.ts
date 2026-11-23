import { describe, expect, it } from "vitest";
import {
  canDraw,
  canRelease,
  createStage,
  drawIntoChannel,
  releaseCast,
  shouldAutoRelease,
} from "./round";
import { makeState, num, unstable } from "./test-helpers";
import type { ChannelRules, Loadout, StageSetup } from "./types";
import { fire } from "../data/cards/elements";
import { crackedStaff } from "../data/cards/items";
import { pierce } from "../data/cards/modifiers";
import { createStartingDeck } from "../data/channel-deck";
import { DEFAULT_CHANNEL_RULES } from "../data/tuning";

const loadout: Loadout = [crackedStaff, pierce, null, null, null];
const release = (state: ReturnType<typeof makeState>) => releaseCast(state, loadout, fire);

const config: StageSetup = { name: "Test Goblin", hp: 150, casts: 4, rule: null };

const roomy: ChannelRules = { ...DEFAULT_CHANNEL_RULES, unstableLimit: 3 };

describe("createStage", () => {
  it("builds a ready stage from the config", () => {
    const stage = createStage(config, createStartingDeck(), 123);

    expect(stage.name).toBe("Test Goblin");
    expect(stage.rule).toBe(null);
    expect(stage.targetHp).toBe(150);
    expect(stage.castsRemaining).toBe(4);
    expect(stage.castNumber).toBe(1);
    expect(stage.totalDamage).toBe(0);
    expect(stage.status).toBe("ready");
    expect(stage.drawPile).toHaveLength(20);
    expect(stage.discardPile).toEqual([]);
    expect(stage.channel).toEqual([]);
    expect(stage.stacks).toEqual({});
  });

  it("carries the stage rule from the config", () => {
    const rule = { kind: "multiplierCap", max: 2 } as const;
    const stage = createStage({ ...config, rule }, createStartingDeck(), 123);

    expect(stage.rule).toEqual(rule);
  });

  it("keeps all 20 cards: 14 numbers and 6 Unstable", () => {
    const stage = createStage(config, createStartingDeck(), 123);

    expect(stage.drawPile.filter((card) => card.kind === "number")).toHaveLength(14);
    expect(stage.drawPile.filter((card) => card.kind === "unstable")).toHaveLength(6);
  });

  it("is repeatable for the same seed and leaves the deck untouched", () => {
    const deck = createStartingDeck();
    const copy = [...deck];

    const a = createStage(config, deck, 123);
    const b = createStage(config, deck, 123);

    expect(a).toEqual(b);
    expect(deck).toEqual(copy);
  });
});

describe("canDraw, canRelease and shouldAutoRelease", () => {
  it("allows drawing from a ready stage with cards left", () => {
    expect(canDraw(makeState({ drawPile: [num(1)] }))).toBe(true);
  });

  it("does not allow drawing when the pile is empty, the channel is full, or it backfired", () => {
    expect(canDraw(makeState({ drawPile: [] }))).toBe(false);
    expect(
      canDraw(
        makeState({
          drawPile: [num(1)],
          channel: [num(1), num(2), num(3), num(4), num(5)],
        }),
      ),
    ).toBe(false);
    expect(canDraw(makeState({ drawPile: [num(1)], channel: [unstable, unstable] }))).toBe(false);
  });

  it("does not allow any action once the stage is over", () => {
    const over = makeState({ status: "cleared", drawPile: [num(1)], channel: [num(1)] });

    expect(canDraw(over)).toBe(false);
    expect(canRelease(over)).toBe(false);
  });

  it("allows releasing only when the channel has cards", () => {
    expect(canRelease(makeState())).toBe(false);
    expect(canRelease(makeState({ channel: [num(1)] }))).toBe(true);
  });

  it("auto-releases when the channel is full or has backfired", () => {
    expect(shouldAutoRelease(makeState())).toBe(false);
    expect(shouldAutoRelease(makeState({ channel: [num(1)] }))).toBe(false);
    expect(shouldAutoRelease(makeState({ channel: [unstable, unstable] }))).toBe(true);
    expect(
      shouldAutoRelease(makeState({ channel: [num(1), num(2), num(3), num(4), num(5)] })),
    ).toBe(true);
  });

  it("uses the channel rules: a higher Unstable limit keeps the channel open", () => {
    const state = makeState({ drawPile: [num(1)], channel: [unstable, unstable] });

    expect(canDraw(state, roomy)).toBe(true);
    expect(shouldAutoRelease(state, roomy)).toBe(false);
  });
});

describe("drawIntoChannel", () => {
  it("draws a card and marks the stage as casting", () => {
    const result = drawIntoChannel(makeState({ drawPile: [num(5)] }));

    expect(result.card).toEqual(num(5));
    expect(result.nextState.channel).toEqual([num(5)]);
    expect(result.nextState.status).toBe("casting");
  });

  it("throws once the stage is over", () => {
    expect(() => drawIntoChannel(makeState({ status: "failed", drawPile: [num(1)] }))).toThrow();
  });

  it("uses the channel rules when deciding about a backfire", () => {
    const state = makeState({ drawPile: [unstable], channel: [unstable] });

    expect(drawIntoChannel(state).backfired).toBe(true);
    expect(drawIntoChannel(state, roomy).backfired).toBe(false);
  });
});

describe("releaseCast", () => {
  it("scores the cast and does the stage bookkeeping", () => {
    const state = makeState({
      channel: [num(5), unstable, num(3)],
      drawPile: [num(1), num(2)],
    });
    const result = release(state);

    expect(result.score).toBe(84);
    expect(result.nextState.totalDamage).toBe(84);
    expect(result.nextState.castsRemaining).toBe(3);
    expect(result.nextState.castNumber).toBe(2);
    expect(result.nextState.channel).toEqual([]);
    expect(result.nextState.discardPile).toEqual([num(5), unstable, num(3)]);
    expect(result.nextState.drawPile).toEqual([num(1), num(2)]);
    expect(result.nextState.stacks).toEqual({ burn: 1 });
    expect(result.nextState.status).toBe("ready");
  });

  it("clears the stage when the damage reaches the target", () => {
    const state = makeState({ targetHp: 84, channel: [num(5), unstable, num(3)] });

    expect(release(state).nextState.status).toBe("cleared");
  });

  it("fails the stage when the casts run out before the target", () => {
    const state = makeState({
      targetHp: 1000,
      castsRemaining: 1,
      channel: [num(5), unstable, num(3)],
    });

    expect(release(state).nextState.status).toBe("failed");
  });

  it("uses up the cast on a backfire", () => {
    const state = makeState({ channel: [unstable, unstable] });
    const result = release(state);

    expect(result.backfired).toBe(true);
    expect(result.score).toBe(0);
    expect(result.nextState.castsRemaining).toBe(3);
    expect(result.nextState.totalDamage).toBe(0);
    expect(result.nextState.discardPile).toEqual([unstable, unstable]);
    expect(result.nextState.status).toBe("ready");
  });

  it("does not mutate the input state", () => {
    const state = makeState({ channel: [num(5), unstable, num(3)] });
    const before = structuredClone(state);

    release(state);

    expect(state).toEqual(before);
  });

  it("throws on an empty channel and once the stage is over", () => {
    expect(() => release(makeState())).toThrow();
    expect(() =>
      release(makeState({ status: "cleared", channel: [num(1)] })),
    ).toThrow();
  });
});

describe("a stage over several casts", () => {
  it("keeps the draw pile across casts and sends drawn cards to the discard pile", () => {
    let stage = makeState({
      drawPile: [num(5), unstable, num(3), num(4), num(4)],
    });

    // cast 1: draw 5, Unstable, 3, then release
    for (let i = 0; i < 3; i++) {
      stage = drawIntoChannel(stage).nextState;
    }
    stage = release(stage).nextState;

    expect(stage.drawPile).toEqual([num(4), num(4)]);
    expect(stage.discardPile).toEqual([num(5), unstable, num(3)]);

    // cast 2: draw 4, 4, then release
    for (let i = 0; i < 2; i++) {
      stage = drawIntoChannel(stage).nextState;
    }
    stage = release(stage).nextState;

    expect(stage.totalDamage).toBe(84 + 52);
    expect(stage.castsRemaining).toBe(2);
    expect(stage.castNumber).toBe(3);
    expect(stage.drawPile).toEqual([]);
    expect(stage.discardPile).toHaveLength(5);
    expect(stage.status).toBe("ready");
  });
});
