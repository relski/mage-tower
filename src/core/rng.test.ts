import { describe, expect, it } from "vitest";
import { nextRandom, randomInteger, shuffle } from "./rng";

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

describe("randomInteger", () => {
  it("returns an integer inside the inclusive range and is repeatable", () => {
    const first = randomInteger(4, 9, 123);

    expect(first.value).toBeGreaterThanOrEqual(4);
    expect(first.value).toBeLessThanOrEqual(9);
    expect(Number.isInteger(first.value)).toBe(true);
    expect(first).toEqual(randomInteger(4, 9, 123));
  });

  it("returns the bound for a one-value range", () => {
    expect(randomInteger(7, 7, 123).value).toBe(7);
  });

  it("rejects invalid ranges", () => {
    expect(() => randomInteger(5, 4, 123)).toThrow();
    expect(() => randomInteger(1.5, 4, 123)).toThrow();
  });
});
