import { describe, expect, it } from "vitest";
import {
  channelMultiplier,
  channelPower,
  drawCard,
  isBackfired,
} from "./channel";
import { describeRule, getChannelRules } from "./rules";
import { makeState, num, unstable } from "./test-helpers";
import type { ChannelRules, Loadout } from "./types";
import { earth } from "../data/cards/elements";
import { DEFAULT_CHANNEL_RULES, UNSTABLE_LIMIT } from "../data/tuning";

const none: Loadout = [null, null, null, null, null];

describe("getChannelRules", () => {
  it("returns the defaults for an empty loadout and no stage rule", () => {
    expect(getChannelRules(none, null)).toEqual(DEFAULT_CHANNEL_RULES);
  });

  it("adds Unstable tolerance from the fixed element (Earth)", () => {
    const rules = getChannelRules(none, null, earth);

    expect(rules.unstableLimit).toBe(UNSTABLE_LIMIT + 1);
  });

  it("applies a stage rule on top of the fixed element", () => {

    expect(
      getChannelRules(none, { kind: "unstableLimitDelta", value: -1 }, earth).unstableLimit,
    ).toBe(UNSTABLE_LIMIT);
    expect(getChannelRules(none, { kind: "multiplierCap", max: 2 }).multiplierCap).toBe(2);
    expect(getChannelRules(none, { kind: "halfValueAbove", threshold: 5 }).halfValueAbove).toBe(5);
  });

  it("never lets the Unstable limit drop below 1", () => {
    const rules = getChannelRules(none, { kind: "unstableLimitDelta", value: -10 });

    expect(rules.unstableLimit).toBe(1);
  });
});

describe("describeRule", () => {
  it("describes each kind of stage rule", () => {
    expect(describeRule({ kind: "unstableLimitDelta", value: -1 })).toBe(
      "Backfire 1 Unstable card sooner",
    );
    expect(describeRule({ kind: "unstableLimitDelta", value: 2 })).toBe(
      "Backfire 2 Unstable cards later",
    );
    expect(describeRule({ kind: "multiplierCap", max: 2 })).toBe(
      "Channel multiplier is capped at ×2",
    );
    expect(describeRule({ kind: "halfValueAbove", threshold: 5 })).toBe(
      "Number cards above 5 count as half value",
    );
  });
});

describe("channel functions with rules", () => {
  const rules = (overrides: Partial<ChannelRules>): ChannelRules => ({
    ...DEFAULT_CHANNEL_RULES,
    ...overrides,
  });

  it("isBackfired respects a higher or lower Unstable limit", () => {
    expect(isBackfired([unstable, unstable], rules({ unstableLimit: 3 }))).toBe(false);
    expect(isBackfired([unstable, unstable, unstable], rules({ unstableLimit: 3 }))).toBe(true);
    expect(isBackfired([unstable], rules({ unstableLimit: 1 }))).toBe(true);
  });

  it("channelMultiplier is capped by the multiplier cap", () => {
    expect(channelMultiplier(5, rules({ multiplierCap: 2 }))).toBe(2);
    expect(channelMultiplier(1, rules({ multiplierCap: 2 }))).toBe(1);
  });

  it("channelPower halves number cards above the threshold and rounds down", () => {
    expect(channelPower([num(7), num(5), num(6)], rules({ halfValueAbove: 5 }))).toBe(3 + 5 + 3);
  });

  it("drawCard does not backfire on the second Unstable card with a higher limit", () => {
    const state = makeState({ drawPile: [unstable], channel: [unstable] });

    expect(drawCard(state, rules({ unstableLimit: 3 })).backfired).toBe(false);
  });
});
