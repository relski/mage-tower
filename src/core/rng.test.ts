import { describe, expect, it } from "vitest";
import { nextRandom, shuffle } from "./rng";

describe("nextRandom", () => {
  it("returns a repeatable value and next seed", () => {
    expect(nextRandom(123)).toEqual(nextRandom(123));
  });

  it("returns a value between zero and one", () => {
    const { value } = nextRandom(123);

    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThan(1);
  });
});

describe("shuffle", () => {
  it("is repeatable for the same seed and preserves the input", () => {
    const cards = ["a", "b", "c", "d", "e"];
    const result = shuffle(cards, 123);

    expect(result).toEqual(shuffle(cards, 123));
    expect([...result.cards].sort()).toEqual([...cards].sort());
    expect(cards).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("returns the seed after all shuffle draws", () => {
    const result = shuffle(["a", "b", "c"], 123);
    const afterFirstDraw = nextRandom(123).seed;

    expect(result.seed).toBe(nextRandom(afterFirstDraw).seed);
  });
});
