import { describe, expect, it } from "vitest";
import {
  channelMultiplier,
  channelPower,
  drawCard,
  isBackfired,
  unstableCount,
} from "./channel";
import { makeState, num, unstable } from "./test-helpers";

describe("channelMultiplier", () => {
  it("reads the multiplier for 1 to 5 cards", () => {
    expect([1, 2, 3, 4, 5].map((cards) => channelMultiplier(cards))).toEqual([
      1, 1.5, 2, 2.5, 3,
    ]);
  });

  it("throws when there is no multiplier for that many cards", () => {
    expect(() => channelMultiplier(0)).toThrow();
    expect(() => channelMultiplier(6)).toThrow();
  });
});

describe("unstableCount and isBackfired", () => {
  it("counts Unstable cards", () => {
    expect(unstableCount([num(5), unstable, num(3), unstable])).toBe(2);
  });

  it("does not backfire on the first Unstable card", () => {
    expect(isBackfired([num(5), unstable])).toBe(false);
  });

  it("backfires when the Unstable count reaches the limit", () => {
    expect(isBackfired([unstable, unstable])).toBe(true);
  });
});

describe("channelPower", () => {
  it("adds up number cards and ignores Unstable cards", () => {
    expect(channelPower([num(5), unstable, num(3)])).toBe(8);
  });

  it("is 0 for an empty channel", () => {
    expect(channelPower([])).toBe(0);
  });
});

describe("drawCard", () => {
  it("moves the top card from the draw pile to the end of the channel", () => {
    const state = makeState({ drawPile: [num(5), num(3)], channel: [num(1)] });
    const result = drawCard(state);

    expect(result.card).toEqual(num(5));
    expect(result.nextState.channel).toEqual([num(1), num(5)]);
    expect(result.nextState.drawPile).toEqual([num(3)]);
    expect(result.backfired).toBe(false);
  });

  it("does not mutate the input state", () => {
    const state = makeState({ drawPile: [num(5), unstable] });
    const before = structuredClone(state);

    drawCard(state);

    expect(state).toEqual(before);
  });

  it("does not backfire on the first Unstable card", () => {
    const result = drawCard(makeState({ drawPile: [unstable] }));

    expect(result.backfired).toBe(false);
  });

  it("backfires on the second Unstable card and keeps it in the channel", () => {
    const state = makeState({ drawPile: [unstable], channel: [unstable] });
    const result = drawCard(state);

    expect(result.backfired).toBe(true);
    expect(result.nextState.channel).toEqual([unstable, unstable]);
  });

  it("throws when the channel is full", () => {
    const state = makeState({
      drawPile: [num(1)],
      channel: [num(1), num(2), num(3), num(4), num(5)],
    });

    expect(() => drawCard(state)).toThrow();
  });

  it("throws after a backfire", () => {
    const state = makeState({ drawPile: [num(1)], channel: [unstable, unstable] });

    expect(() => drawCard(state)).toThrow();
  });

  it("throws when the draw pile is empty", () => {
    expect(() => drawCard(makeState({ drawPile: [] }))).toThrow();
  });
});
