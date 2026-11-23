import { describe, expect, it } from "vitest";
import { nextRandom, pickRandom } from "./rng";

describe("pickRandom", () => {
  it("picks an entry from the list and returns the next seed", () => {
    const list = ["a", "b", "c"];
    const result = pickRandom(list, 123);

    expect(list).toContain(result.value);
    expect(result.seed).toBe(nextRandom(123).seed);
  });

  it("is repeatable for the same seed", () => {
    expect(pickRandom([1, 2, 3, 4, 5], 42)).toEqual(pickRandom([1, 2, 3, 4, 5], 42));
  });

  it("can reach every entry over many seeds", () => {
    const seen = new Set<number>();

    for (let seed = 1; seed <= 200; seed++) {
      seen.add(pickRandom([1, 2, 3, 4], seed).value);
    }

    expect(seen.size).toBe(4);
  });

  it("always returns the only entry of a one-entry list", () => {
    expect(pickRandom(["only"], 7).value).toBe("only");
  });

  it("throws for an empty list", () => {
    expect(() => pickRandom([], 1)).toThrow();
  });
});
