import type { Card, Loadout } from "./types";
import { pickRandom } from "./rng";

export const SLOT_COUNT = 5;

// The element stays outside the loadout but keeps its original position between slot 1 and slot 2.
export function cardsInEffectOrder(loadout: Loadout, element: Card | null): (Card | null)[] {
  const cards = [...loadout];
  cards.splice(1, 0, element);

  return cards;
}

// the starting loadout: a random item and modifier, followed by three empty slots
export function createStartingLoadout(
  modifiers: readonly Card[],
  items: readonly Card[],
  seed: number,
): { loadout: Loadout; seed: number } {
  const modifier = pickRandom(modifiers, seed);
  const item = pickRandom(items, modifier.seed);

  return {
    loadout: [item.value, modifier.value, null, null, null],
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
