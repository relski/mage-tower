import type { Card, ChannelCard, Loadout } from "./types";
import { SLOT_COUNT } from "./loadout";
import { pickRandom } from "./rng";
import {
  CARD_PRICE,
  REMOVE_UNSTABLE_PRICE,
  REWARD_NUMBER_VALUES,
  SLOT_UNLOCK_PRICES,
  STAGE_CLEAR_GOLD,
  STARTING_UNLOCKED_SLOTS,
  UNUSED_CAST_GOLD,
} from "../data/tuning";

// what the player can pick after clearing a stage
export type RewardOption =
  | { kind: "card", card: Card }                 // a loadout card, placed in a slot
  | { kind: "addNumber", value: number }         // add a number card to the channel deck
  | { kind: "removeUnstable" }                   // remove one Unstable card from the deck
  | { kind: "removeLowestNumber" };              // remove the lowest number card from the deck

// what the player can buy in the shop
export type ShopOffer =
  | { kind: "card", card: Card, price: number }
  | { kind: "removeUnstable", price: number }
  | { kind: "unlockSlot", slot: number, price: number };

// gold for clearing a stage: a flat amount plus a bonus for every cast left over
export function stageClearGold(castsRemaining: number): number {
  return STAGE_CLEAR_GOLD + UNUSED_CAST_GOLD * Math.max(0, castsRemaining);
}

export function describeReward(option: RewardOption): string {
  switch (option.kind) {
    case "card":
      return `${option.card.name}: ${option.card.description ?? option.card.type}`;
    case "addNumber":
      return `Add a ${option.value} card to your channel deck`;
    case "removeUnstable":
      return "Remove an Unstable card from your channel deck";
    case "removeLowestNumber":
      return "Remove your lowest number card from your channel deck";
  }
}

export function describeOffer(offer: ShopOffer): string {
  switch (offer.kind) {
    case "card":
      return `${offer.card.name}: ${offer.card.description ?? offer.card.type}`;
    case "removeUnstable":
      return "Remove an Unstable card from your channel deck";
    case "unlockSlot":
      return `Unlock loadout slot ${offer.slot + 1}`;
  }
}

// channel deck changes: each returns a new deck and leaves the old one alone

export function addNumberCard(deck: readonly ChannelCard[], value: number): ChannelCard[] {
  return [...deck, { kind: "number", value }];
}

export function removeUnstableCard(deck: readonly ChannelCard[]): ChannelCard[] {
  const index = deck.findIndex((card) => card.kind === "unstable");

  if (index === -1) {
    throw new Error("The deck has no Unstable card to remove");
  }

  return deck.filter((_, i) => i !== index);
}

export function removeLowestNumberCard(deck: readonly ChannelCard[]): ChannelCard[] {
  let lowestIndex = -1;
  let lowestValue = Infinity;

  deck.forEach((card, index) => {
    if (card.kind === "number" && card.value < lowestValue) {
      lowestValue = card.value;
      lowestIndex = index;
    }
  });

  if (lowestIndex === -1) {
    throw new Error("The deck has no number card to remove");
  }

  return deck.filter((_, i) => i !== lowestIndex);
}

// applies a reward that changes the deck (not a loadout card)
export function applyDeckReward(deck: readonly ChannelCard[], option: RewardOption): ChannelCard[] {
  switch (option.kind) {
    case "addNumber":
      return addNumberCard(deck, option.value);
    case "removeUnstable":
      return removeUnstableCard(deck);
    case "removeLowestNumber":
      return removeLowestNumberCard(deck);
    case "card":
      throw new Error("A card reward goes into the loadout, not the deck");
  }
}

function hasUnstable(deck: readonly ChannelCard[]): boolean {
  return deck.some((card) => card.kind === "unstable");
}

// prefers cards the loadout does not already hold; falls back to the whole pool
function freshCards(pool: readonly Card[], loadout: Loadout): readonly Card[] {
  const owned = new Set(
    loadout.filter((card): card is Card => card !== null).map((card) => card.id),
  );
  const fresh = pool.filter((card) => !owned.has(card.id));

  return fresh.length > 0 ? fresh : pool;
}

// three options: a modifier, an item and one change to the channel deck
export function createRewardOptions(
  loadout: Loadout,
  deck: readonly ChannelCard[],
  modifiers: readonly Card[],
  items: readonly Card[],
  seed: number,
): { options: RewardOption[]; seed: number } {
  const modifier = pickRandom(freshCards(modifiers, loadout), seed);
  const item = pickRandom(freshCards(items, loadout), modifier.seed);

  const kinds: ("addNumber" | "removeUnstable" | "removeLowestNumber")[] = ["addNumber"];

  if (hasUnstable(deck)) {
    kinds.push("removeUnstable");
  }

  if (deck.some((card) => card.kind === "number")) {
    kinds.push("removeLowestNumber");
  }

  const kind = pickRandom(kinds, item.seed);
  let rng = kind.seed;
  let deckOption: RewardOption;

  if (kind.value === "addNumber") {
    const value = pickRandom(REWARD_NUMBER_VALUES, rng);
    rng = value.seed;
    deckOption = { kind: "addNumber", value: value.value };
  } else {
    deckOption = { kind: kind.value };
  }

  return {
    options: [
      { kind: "card", card: modifier.value },
      { kind: "card", card: item.value },
      deckOption,
    ],
    seed: rng,
  };
}

// shop offers: a modifier, an item, removing an Unstable card (if the deck has one),
// and the next slot unlock (while there are locked slots left)
export function createShopOffers(
  loadout: Loadout,
  unlockedSlots: number,
  deck: readonly ChannelCard[],
  modifiers: readonly Card[],
  items: readonly Card[],
  seed: number,
): { offers: ShopOffer[]; seed: number } {
  const modifier = pickRandom(freshCards(modifiers, loadout), seed);
  const item = pickRandom(freshCards(items, loadout), modifier.seed);

  const offers: ShopOffer[] = [
    { kind: "card", card: modifier.value, price: CARD_PRICE },
    { kind: "card", card: item.value, price: CARD_PRICE },
  ];

  if (hasUnstable(deck)) {
    offers.push({ kind: "removeUnstable", price: REMOVE_UNSTABLE_PRICE });
  }

  const slotPrice = SLOT_UNLOCK_PRICES[unlockedSlots - STARTING_UNLOCKED_SLOTS];

  if (unlockedSlots < SLOT_COUNT && slotPrice !== undefined) {
    offers.push({ kind: "unlockSlot", slot: unlockedSlots, price: slotPrice });
  }

  return { offers, seed: item.seed };
}

// puts a card into an unlocked slot, replacing whatever was there
export function placeCard(
  loadout: Loadout,
  card: Card,
  slot: number,
  unlockedSlots: number,
): { loadout: Loadout; replaced: Card | null } {
  if (card.type === "element") {
    throw new Error("Elements cannot be placed in the loadout");
  }

  if (!Number.isInteger(slot) || slot < 0 || slot >= unlockedSlots) {
    throw new Error(`Slot ${slot} is not an unlocked slot`);
  }

  const next = [...loadout];
  const replaced = next[slot] ?? null;
  next[slot] = card;

  return { loadout: next, replaced };
}
