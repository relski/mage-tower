import type { Card, Loadout } from "./types";
import { pickRandom } from "./rng";

export const SLOT_COUNT = 5;

// the starting loadout: the chosen element, a random modifier and a random item.
// Slot order is item, element, modifier; the last two slots start empty.
export function createStartingLoadout(
  element: Card,
  modifiers: readonly Card[],
  items: readonly Card[],
  seed: number,
): { loadout: Loadout; seed: number } {
  const modifier = pickRandom(modifiers, seed);
  const item = pickRandom(items, modifier.seed);

  return {
    loadout: [item.value, element, modifier.value, null, null],
    seed: item.seed,
  };
}

// swaps two slots and returns a new loadout (empty slots can be swapped too)
export function swapSlots(loadout: Loadout, a: number, b: number): Loadout {
  const valid = (index: number): boolean =>
    Number.isInteger(index) && index >= 0 && index < loadout.length;

  if (!valid(a) || !valid(b)) {
    throw new Error(`Cannot swap slots ${a} and ${b}`);
  }

  const next = [...loadout];
  [next[a], next[b]] = [loadout[b] as Card | null, loadout[a] as Card | null];

  return next;
}
