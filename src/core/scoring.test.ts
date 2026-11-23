import { describe, expect, it } from "vitest";
import { nextRandom } from "./rng";
import { resolveCast } from "./scoring";
import { makeState, num, unstable } from "./test-helpers";
import type { Card, Loadout } from "./types";
import { fire } from "../data/cards/elements";
import { crackedStaff } from "../data/cards/items";
import { pierce } from "../data/cards/modifiers";

const loadout: Loadout = [crackedStaff, fire, pierce, null, null];

describe("resolveCast: reference casts", () => {
  it("scores cast 1 (draw 5, Unstable, 3) as 84", () => {
    const state = makeState({ channel: [num(5), unstable, num(3)] });
    const result = resolveCast(loadout, state);

    expect(result.score).toBe(84);
    expect(result.backfired).toBe(false);
    expect(result.trace[0]).toEqual({
      source: "Channel",
      description: "power 8 × 2 (3 cards)",
      total: 16,
    });
    expect(result.trace.map((step) => step.total)).toEqual([16, 36, 56, 56, 84]);
    expect(result.nextState.stacks).toEqual({ burn: 1 });
  });

  it("scores cast 2 (one burn stack, draw 4, 4) as 57", () => {
    const state = makeState({
      castNumber: 2,
      stacks: { burn: 1 },
      channel: [num(4), num(4)],
    });
    const result = resolveCast(loadout, state);

    expect(result.score).toBe(57);
    expect(result.trace.map((step) => step.total)).toEqual([12, 32, 38, 38, 57]);
    expect(result.nextState.stacks).toEqual({ burn: 2 });
  });

  it("scores 74 when the loadout is reordered to Fire, Pierce, Staff", () => {
    const reordered: Loadout = [fire, pierce, crackedStaff, null, null];
    const state = makeState({ channel: [num(5), unstable, num(3)] });

    expect(resolveCast(reordered, state).score).toBe(74);
  });
});

describe("resolveCast: backfire", () => {
  it("scores 0 when the second Unstable card is drawn", () => {
    const state = makeState({ channel: [unstable, unstable] });
    const result = resolveCast(loadout, state);

    expect(result.score).toBe(0);
    expect(result.backfired).toBe(true);
    expect(result.trace[0]?.description).toContain("Backfire");
  });

  it("does not trigger the loadout on a backfire", () => {
    const state = makeState({ channel: [num(5), unstable, unstable] });
    const result = resolveCast(loadout, state);

    expect(result.score).toBe(0);
    expect(result.nextState.stacks).toEqual({});
  });
});

describe("resolveCast: rules", () => {
  it("skips empty slots", () => {
    const gaps: Loadout = [null, crackedStaff, null, fire, pierce];
    const state = makeState({ channel: [num(5), unstable, num(3)] });

    expect(resolveCast(gaps, state).score).toBe(84);
  });

  it("rounds down after every multiplication", () => {
    // power 3 × 1.5 = 4.5 -> 4, then Pierce 4 × 1.5 = 6
    const state = makeState({ channel: [num(1), num(2)] });

    expect(resolveCast([pierce, null, null, null, null], state).score).toBe(6);
  });

  it("does not mutate the input state", () => {
    const state = makeState({ channel: [num(5), unstable, num(3)] });
    const before = structuredClone(state);

    resolveCast(loadout, state);

    expect(state).toEqual(before);
  });

  it("throws on an empty channel", () => {
    expect(() => resolveCast(loadout, makeState())).toThrow();
  });
});

describe("resolveCast: triggers", () => {
  const everyThird: Card = {
    id: "test_every_third",
    name: "Every Third",
    type: "item",
    effects: [
      {
        trigger: { kind: "everyNthCast", n: 3 },
        action: { kind: "addDamage", value: 10 },
      },
    ],
  };

  it("fires everyNthCast only on every Nth cast", () => {
    const slots: Loadout = [everyThird, null, null, null, null];
    const score = (castNumber: number) =>
      resolveCast(slots, makeState({ castNumber, channel: [num(1)] })).score;

    expect(score(1)).toBe(1);
    expect(score(2)).toBe(1);
    expect(score(3)).toBe(11);
    expect(score(6)).toBe(11);
  });

  it("fires firstCast only on cast 1", () => {
    const slots: Loadout = [crackedStaff, null, null, null, null];
    const score = (castNumber: number) =>
      resolveCast(slots, makeState({ castNumber, channel: [num(1)] })).score;

    expect(score(1)).toBe(21);
    expect(score(2)).toBe(1);
  });

  it("fires a chance trigger always with p = 1 and never with p = 0", () => {
    const chanceCard = (p: number): Card => ({
      id: "test_chance",
      name: "Chance",
      type: "item",
      effects: [
        { trigger: { kind: "chance", p }, action: { kind: "addDamage", value: 10 } },
      ],
    });
    const score = (p: number) =>
      resolveCast([chanceCard(p), null, null, null, null], makeState({ channel: [num(1)] })).score;

    expect(score(1)).toBe(11);
    expect(score(0)).toBe(1);
  });

  it("rolls the seeded RNG for chance triggers and returns the next seed", () => {
    const lucky: Card = {
      id: "test_lucky",
      name: "Lucky",
      type: "item",
      effects: [
        { trigger: { kind: "chance", p: 0.5 }, action: { kind: "addDamage", value: 10 } },
      ],
    };
    const state = makeState({ channel: [num(1)], seed: 99 });
    const a = resolveCast([lucky, null, null, null, null], state);
    const b = resolveCast([lucky, null, null, null, null], state);

    expect(a.nextState.seed).toBe(nextRandom(99).seed);
    expect(a).toEqual(b);
  });

  it("fires channelHasUnstable only when the channel has an Unstable card", () => {
    const static_: Card = {
      id: "test_static",
      name: "Static",
      type: "item",
      effects: [
        { trigger: { kind: "channelHasUnstable" }, action: { kind: "addDamage", value: 10 } },
      ],
    };
    const slots: Loadout = [static_, null, null, null, null];

    expect(resolveCast(slots, makeState({ channel: [num(1), unstable] })).score).toBe(11);
    expect(resolveCast(slots, makeState({ channel: [num(1)] })).score).toBe(1);
  });
});

describe("resolveCast: stage rules", () => {
  const empty: Loadout = [null, null, null, null, null];

  it("caps the channel multiplier", () => {
    // power 20 × 2.5 would be 50, capped at ×2 gives 40
    const state = makeState({
      channel: [num(5), num(5), num(5), num(5)],
      rule: { kind: "multiplierCap", max: 2 },
    });
    const result = resolveCast(empty, state);

    expect(result.score).toBe(40);
    expect(result.trace[0]?.description).toContain("capped");
  });

  it("halves number cards above the threshold, rounding down", () => {
    // 7 counts as 3, so power is 3 + 2 = 5, then ×1.5 = 7
    const state = makeState({
      channel: [num(7), num(2)],
      rule: { kind: "halfValueAbove", threshold: 5 },
    });

    expect(resolveCast(empty, state).score).toBe(7);
  });

  it("can make the channel backfire sooner", () => {
    const channel = [unstable];

    expect(resolveCast(empty, makeState({ channel })).backfired).toBe(false);
    expect(
      resolveCast(empty, makeState({ channel, rule: { kind: "unstableLimitDelta", value: -1 } }))
        .backfired,
    ).toBe(true);
  });
});
