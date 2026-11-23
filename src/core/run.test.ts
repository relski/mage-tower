import { describe, expect, it } from "vitest";
import {
  addNumberCard,
  applyDeckReward,
  createRewardOptions,
  createShopOffers,
  describeOffer,
  describeReward,
  placeCard,
  removeLowestNumberCard,
  removeUnstableCard,
  stageClearGold,
} from "./run";
import type { RewardOption } from "./run";
import { num, unstable } from "./test-helpers";
import type { Loadout } from "./types";
import { fire } from "../data/cards/elements";
import { ITEMS, crackedStaff } from "../data/cards/items";
import { MODIFIERS, pierce } from "../data/cards/modifiers";
import { createStartingDeck } from "../data/channel-deck";
import {
  CARD_PRICE,
  REMOVE_UNSTABLE_PRICE,
  REWARD_NUMBER_VALUES,
  SLOT_UNLOCK_PRICES,
  STAGE_CLEAR_GOLD,
  UNUSED_CAST_GOLD,
} from "../data/tuning";

const loadout: Loadout = [crackedStaff, pierce, null, null, null];
const deck = createStartingDeck();

describe("stageClearGold", () => {
  it("pays a flat amount plus a bonus for each cast left over", () => {
    expect(stageClearGold(0)).toBe(STAGE_CLEAR_GOLD);
    expect(stageClearGold(2)).toBe(STAGE_CLEAR_GOLD + 2 * UNUSED_CAST_GOLD);
  });

  it("ignores a negative number of casts", () => {
    expect(stageClearGold(-3)).toBe(STAGE_CLEAR_GOLD);
  });
});

describe("channel deck changes", () => {
  it("addNumberCard adds a number card and leaves the old deck alone", () => {
    const before = [...deck];
    const next = addNumberCard(deck, 9);

    expect(next).toHaveLength(21);
    expect(next.at(-1)).toEqual(num(9));
    expect(deck).toEqual(before);
  });

  it("removeUnstableCard removes exactly one Unstable card", () => {
    const next = removeUnstableCard([num(1), unstable, unstable, num(2)]);

    expect(next).toEqual([num(1), unstable, num(2)]);
  });

  it("removeUnstableCard throws when the deck has none", () => {
    expect(() => removeUnstableCard([num(1), num(2)])).toThrow();
  });

  it("removeLowestNumberCard removes one copy of the lowest number", () => {
    const next = removeLowestNumberCard([num(3), num(1), unstable, num(1), num(2)]);

    expect(next).toEqual([num(3), unstable, num(1), num(2)]);
  });

  it("removeLowestNumberCard throws when the deck has no number card", () => {
    expect(() => removeLowestNumberCard([unstable])).toThrow();
  });

  it("applyDeckReward applies the right change and rejects card rewards", () => {
    expect(applyDeckReward([num(1)], { kind: "addNumber", value: 7 })).toEqual([num(1), num(7)]);
    expect(applyDeckReward([unstable, num(1)], { kind: "removeUnstable" })).toEqual([num(1)]);
    expect(applyDeckReward([num(2), num(1)], { kind: "removeLowestNumber" })).toEqual([num(2)]);
    expect(() => applyDeckReward([num(1)], { kind: "card", card: fire })).toThrow();
  });
});

describe("createRewardOptions", () => {
  it("offers a modifier, an item and one deck change", () => {
    const { options } = createRewardOptions(loadout, deck, MODIFIERS, ITEMS, 123);

    expect(options).toHaveLength(3);
    expect(options[0]?.kind).toBe("card");
    expect(options[1]?.kind).toBe("card");
    expect(options[0]?.kind === "card" && options[0].card.type).toBe("modifier");
    expect(options[1]?.kind === "card" && options[1].card.type).toBe("item");
    expect(["addNumber", "removeUnstable", "removeLowestNumber"]).toContain(options[2]?.kind);
  });

  it("is repeatable for the same seed and returns the next seed", () => {
    const a = createRewardOptions(loadout, deck, MODIFIERS, ITEMS, 123);
    const b = createRewardOptions(loadout, deck, MODIFIERS, ITEMS, 123);

    expect(a).toEqual(b);
    expect(a.seed).not.toBe(123);
  });

  it("does not offer cards the loadout already holds", () => {
    for (let seed = 1; seed <= 100; seed++) {
      const { options } = createRewardOptions(loadout, deck, MODIFIERS, ITEMS, seed);
      const [modifier, item] = options;

      expect(modifier?.kind === "card" && modifier.card.id).not.toBe("pierce");
      expect(item?.kind === "card" && item.card.id).not.toBe("cracked_staff");
    }
  });

  it("falls back to the whole pool when every card is already held", () => {
    const { options } = createRewardOptions(loadout, deck, [pierce], [crackedStaff], 5);

    expect(options[0]?.kind === "card" && options[0].card.id).toBe("pierce");
    expect(options[1]?.kind === "card" && options[1].card.id).toBe("cracked_staff");
  });

  it("only offers removing an Unstable card when the deck has one", () => {
    const numbersOnly = [num(1), num(2), num(3)];

    for (let seed = 1; seed <= 100; seed++) {
      const { options } = createRewardOptions(loadout, numbersOnly, MODIFIERS, ITEMS, seed);

      expect(options[2]?.kind).not.toBe("removeUnstable");
    }
  });

  it("can offer every kind of deck change over many seeds", () => {
    const kinds = new Set<string>();

    for (let seed = 1; seed <= 200; seed++) {
      kinds.add(createRewardOptions(loadout, deck, MODIFIERS, ITEMS, seed).options[2]?.kind ?? "");
    }

    expect(kinds.size).toBe(3);
  });

  it("only adds number cards from the reward values", () => {
    for (let seed = 1; seed <= 200; seed++) {
      const option = createRewardOptions(loadout, deck, MODIFIERS, ITEMS, seed).options[2];

      if (option?.kind === "addNumber") {
        expect([...REWARD_NUMBER_VALUES]).toContain(option.value);
      }
    }
  });
});

describe("createShopOffers", () => {
  it("offers a modifier, an item, removing an Unstable card and the next slot", () => {
    const { offers } = createShopOffers(loadout, 3, deck, MODIFIERS, ITEMS, 123);

    expect(offers).toHaveLength(4);
    expect(offers[0]?.kind).toBe("card");
    expect(offers[0]?.price).toBe(CARD_PRICE);
    expect(offers[1]?.kind).toBe("card");
    expect(offers[1]?.price).toBe(CARD_PRICE);
    expect(offers[2]).toEqual({ kind: "removeUnstable", price: REMOVE_UNSTABLE_PRICE });
    expect(offers[3]).toEqual({ kind: "unlockSlot", slot: 3, price: SLOT_UNLOCK_PRICES[0] });
  });

  it("prices the second slot unlock separately", () => {
    const { offers } = createShopOffers(loadout, 4, deck, MODIFIERS, ITEMS, 123);

    expect(offers.at(-1)).toEqual({ kind: "unlockSlot", slot: 4, price: SLOT_UNLOCK_PRICES[1] });
  });

  it("offers no slot unlock once every slot is unlocked", () => {
    const { offers } = createShopOffers(loadout, 5, deck, MODIFIERS, ITEMS, 123);

    expect(offers.some((offer) => offer.kind === "unlockSlot")).toBe(false);
  });

  it("offers no Unstable removal when the deck has none", () => {
    const { offers } = createShopOffers(loadout, 3, [num(1)], MODIFIERS, ITEMS, 123);

    expect(offers.some((offer) => offer.kind === "removeUnstable")).toBe(false);
  });

  it("is repeatable for the same seed", () => {
    expect(createShopOffers(loadout, 3, deck, MODIFIERS, ITEMS, 9)).toEqual(
      createShopOffers(loadout, 3, deck, MODIFIERS, ITEMS, 9),
    );
  });
});

describe("placeCard", () => {
  it("puts a card into an empty unlocked slot", () => {
    const result = placeCard(loadout, MODIFIERS[1]!, 3, 4);

    expect(result.loadout[3]).toBe(MODIFIERS[1]);
    expect(result.replaced).toBe(null);
  });

  it("replaces the card in a slot and reports it", () => {
    const result = placeCard(loadout, MODIFIERS[1]!, 1, 3);

    expect(result.loadout[1]).toBe(MODIFIERS[1]);
    expect(result.replaced).toBe(pierce);
  });

  it("does not change the original loadout", () => {
    const before = [...loadout];

    placeCard(loadout, MODIFIERS[1]!, 0, 3);

    expect(loadout).toEqual(before);
  });

  it("throws for a locked or invalid slot", () => {
    expect(() => placeCard(loadout, pierce, 3, 3)).toThrow();
    expect(() => placeCard(loadout, pierce, -1, 3)).toThrow();
    expect(() => placeCard(loadout, pierce, 0.5, 3)).toThrow();
  });

  it("does not allow elements to be placed in the loadout", () => {
    expect(() => placeCard(loadout, fire, 0, 3)).toThrow();
  });
});

describe("describeReward and describeOffer", () => {
  it("describes every kind", () => {
    const options: RewardOption[] = [
      { kind: "card", card: pierce },
      { kind: "addNumber", value: 8 },
      { kind: "removeUnstable" },
      { kind: "removeLowestNumber" },
    ];

    expect(options.map(describeReward)).toEqual([
      "Pierce: ×1.5 on every cast",
      "Add a 8 card to your channel deck",
      "Remove an Unstable card from your channel deck",
      "Remove your lowest number card from your channel deck",
    ]);
    expect(describeOffer({ kind: "unlockSlot", slot: 3, price: 25 })).toBe("Unlock loadout slot 4");
    expect(describeOffer({ kind: "removeUnstable", price: 15 })).toBe(
      "Remove an Unstable card from your channel deck",
    );
    expect(describeOffer({ kind: "card", card: pierce, price: 20 })).toBe(
      "Pierce: ×1.5 on every cast",
    );
  });
});
