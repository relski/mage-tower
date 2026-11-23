import { describe, expect, it } from "vitest";
import { getChannelRules } from "../../core/rules";
import { nextRandom } from "../../core/rng";
import { resolveCast } from "../../core/scoring";
import { makeState, num, unstable } from "../../core/test-helpers";
import type { Card, Loadout } from "../../core/types";
import { ELEMENTS } from "./elements";
import {
  emberCharm,
  fuseWire,
  gamblersDie,
  hourglass,
  ITEMS,
  leadWeight,
  rabbitsFoot,
} from "./items";
import {
  backdraft,
  finisher,
  fortune,
  gambler,
  glassCannon,
  kindle,
  longshot,
  MODIFIERS,
  quicken,
  steady,
  thrice,
  ward,
  wildfire,
} from "./modifiers";

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

// power 5 × 1.5 (2 cards) = 7 before any card does anything
const base = (overrides: Parameters<typeof makeState>[0] = {}) =>
  makeState({ channel: [num(5), unstable], ...overrides });

describe("card pools", () => {
  it("has 4 elements, 16 modifiers and 10 items of the right type", () => {
    expect(ELEMENTS).toHaveLength(4);
    expect(MODIFIERS).toHaveLength(16);
    expect(ITEMS).toHaveLength(10);
    expect(ELEMENTS.every((card) => card.type === "element")).toBe(true);
    expect(MODIFIERS.every((card) => card.type === "modifier")).toBe(true);
    expect(ITEMS.every((card) => card.type === "item")).toBe(true);
  });

  it("gives every card a unique id and a description", () => {
    const all = [...ELEMENTS, ...MODIFIERS, ...ITEMS];
    const ids = new Set(all.map((card) => card.id));

    expect(ids.size).toBe(all.length);
    expect(all.every((card) => (card.description ?? "").length > 0)).toBe(true);
    expect(all.every((card) => card.effects.length > 0)).toBe(true);
  });
});

describe("more modifiers", () => {
  it("Thrice multiplies every 3rd cast by 2.5", () => {
    expect(resolveCast(solo(thrice), base({ castNumber: 3 })).score).toBe(17);
    expect(resolveCast(solo(thrice), base({ castNumber: 1 })).score).toBe(7);
  });

  it("Finisher multiplies every 4th cast by 2.5", () => {
    expect(resolveCast(solo(finisher), base({ castNumber: 4 })).score).toBe(17);
    expect(resolveCast(solo(finisher), base({ castNumber: 3 })).score).toBe(7);
  });

  it("Gambler, Longshot and Fortune multiply on a lucky roll only", () => {
    const check = (card: Card, p: number, hit: number) => {
      expect(resolveCast(solo(card), base({ seed: findSeed(p, true) })).score).toBe(hit);
      expect(resolveCast(solo(card), base({ seed: findSeed(p, false) })).score).toBe(7);
    };

    check(gambler, 0.4, 14);
    check(longshot, 0.25, 21);
    check(fortune, 0.5, 12);
  });

  it("Backdraft adds 10, and multiplies by 1.5 only with an Unstable card", () => {
    // 7 + 10 = 17, ×1.5 = 25
    expect(resolveCast(solo(backdraft), base()).score).toBe(25);
    // power 15 × 2 = 30, + 10 = 40
    expect(
      resolveCast(solo(backdraft), makeState({ channel: [num(5), num(5), num(5)] })).score,
    ).toBe(40);
  });

  it("Ward lets the channel hold one more Unstable card", () => {
    expect(getChannelRules(solo(ward), null).unstableLimit).toBe(3);

    const result = resolveCast(solo(ward), makeState({ channel: [num(5), unstable, unstable] }));

    expect(result.backfired).toBe(false);
    expect(result.score).toBe(10);
  });

  it("Glass Cannon multiplies every cast by 2.5, but the first Unstable card backfires", () => {
    expect(getChannelRules(solo(glassCannon), null).unstableLimit).toBe(1);
    // power 10 × 1.5 = 15, ×2.5 = 37
    expect(
      resolveCast(solo(glassCannon), makeState({ channel: [num(5), num(5)] })).score,
    ).toBe(37);

    const backfire = resolveCast(solo(glassCannon), base());

    expect(backfire.backfired).toBe(true);
    expect(backfire.score).toBe(0);
  });

  it("Kindle adds 8 per burn stack and then gains a stack", () => {
    const first = resolveCast(solo(kindle), base());
    const second = resolveCast(solo(kindle), base({ stacks: { burn: 1 } }));

    expect(first.score).toBe(7);
    expect(first.nextState.stacks).toEqual({ burn: 1 });
    expect(second.score).toBe(15);
    expect(second.nextState.stacks).toEqual({ burn: 2 });
  });

  it("Wildfire adds 4 per burn stack and gains 2 stacks", () => {
    const first = resolveCast(solo(wildfire), base());
    const second = resolveCast(solo(wildfire), base({ stacks: { burn: 2 } }));

    expect(first.score).toBe(7);
    expect(first.nextState.stacks).toEqual({ burn: 2 });
    expect(second.score).toBe(15);
    expect(second.nextState.stacks).toEqual({ burn: 4 });
  });

  it("Steady multiplies every cast by 1.3, rounding down", () => {
    expect(resolveCast(solo(steady), base()).score).toBe(9);
  });

  it("Quicken adds 40 on every 2nd cast", () => {
    expect(resolveCast(solo(quicken), base({ castNumber: 2 })).score).toBe(47);
    expect(resolveCast(solo(quicken), base({ castNumber: 1 })).score).toBe(7);
  });
});

describe("more items", () => {
  it("Ember Charm adds 6 per burn stack and then gains a stack", () => {
    const none = resolveCast(solo(emberCharm), base());
    const some = resolveCast(solo(emberCharm), base({ stacks: { burn: 2 } }));

    expect(none.score).toBe(7);
    expect(some.score).toBe(19);
    expect(some.nextState.stacks).toEqual({ burn: 3 });
  });

  it("Lead Weight adds 25 on every 2nd cast", () => {
    expect(resolveCast(solo(leadWeight), base({ castNumber: 2 })).score).toBe(32);
    expect(resolveCast(solo(leadWeight), base({ castNumber: 1 })).score).toBe(7);
  });

  it("Rabbit’s Foot and Gambler’s Die add damage on a lucky roll only", () => {
    const check = (card: Card, p: number, hit: number) => {
      expect(resolveCast(solo(card), base({ seed: findSeed(p, true) })).score).toBe(hit);
      expect(resolveCast(solo(card), base({ seed: findSeed(p, false) })).score).toBe(7);
    };

    check(rabbitsFoot, 0.25, 82);
    check(gamblersDie, 0.5, 37);
  });

  it("Fuse Wire adds 60 on every 4th cast", () => {
    expect(resolveCast(solo(fuseWire), base({ castNumber: 4 })).score).toBe(67);
    expect(resolveCast(solo(fuseWire), base({ castNumber: 1 })).score).toBe(7);
  });

  it("Hourglass adds 5 every cast and 25 more on the first", () => {
    expect(resolveCast(solo(hourglass), base({ castNumber: 1 })).score).toBe(37);
    expect(resolveCast(solo(hourglass), base({ castNumber: 2 })).score).toBe(12);
  });
});
