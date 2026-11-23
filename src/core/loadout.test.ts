import { describe, expect, it } from "vitest";
import { createStartingLoadout, swapSlots } from "./loadout";
import type { Loadout } from "./types";
import { earth, fire } from "../data/cards/elements";
import { ITEMS, crackedStaff } from "../data/cards/items";
import { MODIFIERS, pierce } from "../data/cards/modifiers";

describe("createStartingLoadout", () => {
  it("builds item, element, modifier and two empty slots", () => {
    const { loadout } = createStartingLoadout(fire, MODIFIERS, ITEMS, 123);

    expect(loadout).toHaveLength(5);
    expect(loadout[0]?.type).toBe("item");
    expect(loadout[1]).toBe(fire);
    expect(loadout[2]?.type).toBe("modifier");
    expect(loadout[3]).toBe(null);
    expect(loadout[4]).toBe(null);
  });

  it("is repeatable for the same seed and returns the next seed", () => {
    const a = createStartingLoadout(earth, MODIFIERS, ITEMS, 123);
    const b = createStartingLoadout(earth, MODIFIERS, ITEMS, 123);

    expect(a).toEqual(b);
    expect(a.seed).not.toBe(123);
  });

  it("picks from the given pools only", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const { loadout } = createStartingLoadout(fire, [pierce], [crackedStaff], seed);

      expect(loadout[0]).toBe(crackedStaff);
      expect(loadout[2]).toBe(pierce);
    }
  });

  it("can reach every modifier and every item over many seeds", () => {
    const modifiers = new Set<string>();
    const items = new Set<string>();

    for (let seed = 1; seed <= 200; seed++) {
      const { loadout } = createStartingLoadout(fire, MODIFIERS, ITEMS, seed);
      modifiers.add(loadout[2]?.id ?? "");
      items.add(loadout[0]?.id ?? "");
    }

    expect(modifiers.size).toBe(MODIFIERS.length);
    expect(items.size).toBe(ITEMS.length);
  });

  it("throws when a pool is empty", () => {
    expect(() => createStartingLoadout(fire, [], ITEMS, 1)).toThrow();
  });
});

describe("swapSlots", () => {
  const loadout: Loadout = [crackedStaff, fire, pierce, null, null];

  it("swaps two slots into a new loadout", () => {
    const swapped = swapSlots(loadout, 0, 2);

    expect(swapped).toEqual([pierce, fire, crackedStaff, null, null]);
    expect(loadout).toEqual([crackedStaff, fire, pierce, null, null]);
  });

  it("can move a card into an empty slot", () => {
    expect(swapSlots(loadout, 1, 4)).toEqual([crackedStaff, null, pierce, null, fire]);
  });

  it("throws for slots that do not exist", () => {
    expect(() => swapSlots(loadout, -1, 2)).toThrow();
    expect(() => swapSlots(loadout, 0, 5)).toThrow();
    expect(() => swapSlots(loadout, 0.5, 1)).toThrow();
  });
});
