import { describe, expect, it } from "vitest";
import { isBackfired } from "../../core/channel";
import { nextRandom } from "../../core/rng";
import { getChannelRules } from "../../core/rules";
import { resolveCast } from "../../core/scoring";
import { makeState, num, unstable } from "../../core/test-helpers";
import type { Card, Loadout } from "../../core/types";
import { earth, ice, lightning } from "./elements";
import { crackedStaff, ironRing, luckyCoin, staticRod } from "./items";
import { hex, opener, pierce, twin } from "./modifiers";

// a loadout with just one card in it
function solo(card: Card): Loadout {
  return [card, null, null, null, null];
}

// finds a seed whose first roll is (or is not) below p
function findSeed(p: number, fires: boolean): number {
  for (let seed = 1; seed < 10000; seed++) {
    if ((nextRandom(seed).value < p) === fires) {
      return seed;
    }
  }

  throw new Error("no seed found");
}

describe("Ice", () => {
  it("adds 15 damage and freezes every 3rd cast for ×3", () => {
    const score = (castNumber: number) =>
      resolveCast(solo(ice), makeState({ castNumber, channel: [num(5)] })).score;

    expect(score(1)).toBe(20);
    expect(score(2)).toBe(20);
    expect(score(3)).toBe(60);
    expect(score(6)).toBe(60);
  });
});

describe("Lightning", () => {
  const channel = [num(5), unstable];

  it("gets the Unstable bonus, and ×2 when the 25% roll hits", () => {
    const hit = findSeed(0.25, true);
    const miss = findSeed(0.25, false);

    // power 5 × 1.5 = 7, +20 = 27, then ×2 = 54 on a hit, then +15 for the Unstable card
    expect(resolveCast(solo(lightning), makeState({ channel, seed: hit })).score).toBe(69);
    expect(resolveCast(solo(lightning), makeState({ channel, seed: miss })).score).toBe(42);
  });

  it("gets no Unstable bonus without an Unstable card", () => {
    const miss = findSeed(0.25, false);

    // power 10 × 1.5 = 15, +20 = 35
    expect(
      resolveCast(solo(lightning), makeState({ channel: [num(5), num(5)], seed: miss })).score,
    ).toBe(35);
  });

  it("marks a successful roll in the trace", () => {
    const hit = findSeed(0.25, true);
    const result = resolveCast(solo(lightning), makeState({ channel, seed: hit }));

    expect(result.trace.some((step) => step.description.includes("lucky roll"))).toBe(true);
  });
});

describe("Earth", () => {
  it("lets the channel hold one more Unstable card before backfiring", () => {
    const rules = getChannelRules(solo(earth), null);

    expect(isBackfired([unstable, unstable], rules)).toBe(false);
    expect(isBackfired([unstable, unstable, unstable], rules)).toBe(true);
  });

  it("scores a channel with two Unstable cards instead of backfiring", () => {
    // power 5 × 2 (3 cards) = 10, +15 = 25
    const result = resolveCast(solo(earth), makeState({ channel: [num(5), unstable, unstable] }));

    expect(result.backfired).toBe(false);
    expect(result.score).toBe(25);
  });
});

describe("modifiers", () => {
  // power 5 × 1.5 (2 cards) = 7, with an Unstable card in the channel
  const withUnstable = (castNumber: number) => makeState({ castNumber, channel: [num(5), unstable] });

  it("Pierce multiplies every cast by 1.5", () => {
    expect(resolveCast(solo(pierce), withUnstable(1)).score).toBe(10);
    expect(resolveCast(solo(pierce), withUnstable(2)).score).toBe(10);
  });

  it("Twin doubles every 2nd cast", () => {
    expect(resolveCast(solo(twin), withUnstable(1)).score).toBe(7);
    expect(resolveCast(solo(twin), withUnstable(2)).score).toBe(14);
  });

  it("Opener multiplies the first cast by 2.5 only", () => {
    expect(resolveCast(solo(opener), withUnstable(1)).score).toBe(17);
    expect(resolveCast(solo(opener), withUnstable(2)).score).toBe(7);
  });

  it("Hex multiplies the cast by 1.75 only when the channel has an Unstable card", () => {
    expect(resolveCast(solo(hex), withUnstable(1)).score).toBe(12);
    // power 10 × 1.5 = 15 with no Unstable card
    expect(resolveCast(solo(hex), makeState({ channel: [num(5), num(5)] })).score).toBe(15);
  });
});

describe("items", () => {
  const withUnstable = makeState({ channel: [num(5), unstable] }); // 7 before the item

  it("Cracked Staff adds 20 on the first cast only", () => {
    expect(resolveCast(solo(crackedStaff), withUnstable).score).toBe(27);
    expect(resolveCast(solo(crackedStaff), { ...withUnstable, castNumber: 2 }).score).toBe(7);
  });

  it("Iron Ring adds 12 on every cast", () => {
    expect(resolveCast(solo(ironRing), withUnstable).score).toBe(19);
  });

  it("Static Rod adds 25 only when the channel has an Unstable card", () => {
    expect(resolveCast(solo(staticRod), withUnstable).score).toBe(32);
    // power 10 × 1.5 = 15
    expect(resolveCast(solo(staticRod), makeState({ channel: [num(5), num(5)] })).score).toBe(15);
  });

  it("Lucky Coin adds 50 on a 30% roll", () => {
    const hit = findSeed(0.3, true);
    const miss = findSeed(0.3, false);

    expect(resolveCast(solo(luckyCoin), { ...withUnstable, seed: hit }).score).toBe(57);
    expect(resolveCast(solo(luckyCoin), { ...withUnstable, seed: miss }).score).toBe(7);
  });
});
