import { describe, expect, it } from "vitest";
import { stageClearGold } from "../core/run";
import { makeState, num, unstable } from "../core/test-helpers";
import type { Loadout } from "../core/types";
import { earth, fire } from "../data/cards/elements";
import { crackedStaff } from "../data/cards/items";
import { hex, pierce } from "../data/cards/modifiers";
import { BOSS_RULES } from "../data/stages/bosses";
import { ROUND_STAGES } from "../data/stages/rounds";
import { SELL_CARD_PRICE, SKIP_REWARD_GOLD, STARTING_UNLOCKED_SLOTS } from "../data/tuning";
import {
  applyBuy,
  applyCancelPending,
  applyChooseReward,
  applyDraw,
  applyNextStage,
  applyPick,
  applyRelease,
  applySellCard,
  applySelectSlot,
  applySkipReward,
  createGame,
  rulesFor,
} from "./game";
import type { Game } from "./game";

const reference: Loadout = [crackedStaff, pierce, null, null, null];

// a game that is already in a stage, with a chosen loadout and stage state
function stageGame(
  stage = makeState(),
  loadout: Loadout = reference,
  stageIndex = 0,
  element = fire,
): Game {
  return { ...applyPick(createGame(1), "fire"), loadout, stage, stageIndex, element };
}

// a game waiting at the reward screen
function rewardGame(overrides: Partial<Game> = {}): Game {
  return {
    ...stageGame(makeState({ status: "cleared" })),
    phase: "reward",
    gold: 0,
    rewardOptions: [
      { kind: "card", card: hex },
      { kind: "addNumber", value: 9 },
    ],
    ...overrides,
  };
}

// a game waiting in the shop
function shopGame(overrides: Partial<Game> = {}): Game {
  return {
    ...stageGame(makeState({ status: "cleared" })),
    phase: "shop",
    gold: 100,
    shopOffers: [
      { kind: "card", card: hex, price: 20 },
      { kind: "removeUnstable", price: 15 },
      { kind: "unlockSlot", slot: 3, price: 25 },
    ],
    ...overrides,
  };
}

describe("createGame and applyPick", () => {
  it("starts in the pick phase with no stage, no gold and the starting deck", () => {
    const game = createGame(123);

    expect(game.phase).toBe("pick");
    expect(game.stage).toBe(null);
    expect(game.element).toBe(null);
    expect(game.loadout).toEqual([null, null, null, null, null]);
    expect(game.unlockedSlots).toBe(STARTING_UNLOCKED_SLOTS);
    expect(game.deck).toHaveLength(20);
    expect(game.gold).toBe(0);
    expect(game.startSeed).toBe(123);
  });

  it("choosing an element builds the starting loadout and starts stage 1", () => {
    const game = applyPick(createGame(123), "ice");

    expect(game.phase).toBe("stage");
    expect(game.roundNumber).toBe(1);
    expect(game.stageIndex).toBe(0);
    expect(game.element?.id).toBe("ice");
    expect(game.loadout[0]?.type).toBe("item");
    expect(game.loadout[1]?.type).toBe("modifier");
    expect(game.loadout.slice(2)).toEqual([null, null, null]);
    expect(game.stage?.name).toBe(ROUND_STAGES[0]?.name);
    expect(game.stage?.targetHp).toBeGreaterThanOrEqual(ROUND_STAGES[0]!.hp.minValue);
    expect(game.stage?.targetHp).toBeLessThanOrEqual(ROUND_STAGES[0]!.hp.maxValue);
    expect(game.stage?.drawPile).toHaveLength(20);
    expect(game.log.some((line) => line.includes("You chose Ice"))).toBe(true);
  });

  it("is repeatable for the same seed", () => {
    expect(applyPick(createGame(123), "earth")).toEqual(applyPick(createGame(123), "earth"));
  });

  it("ignores an unknown element and a second pick", () => {
    const fresh = createGame(123);
    const picked = applyPick(fresh, "fire");

    expect(applyPick(fresh, "plasma")).toBe(fresh);
    expect(applyPick(picked, "ice")).toBe(picked);
  });

  it("does nothing for draw or release before an element is picked", () => {
    const game = createGame(123);

    expect(applyDraw(game)).toBe(game);
    expect(applyRelease(game)).toBe(game);
  });
});

describe("applyDraw and applyRelease", () => {
  it("drawing moves a card into the channel", () => {
    const game = applyDraw(applyPick(createGame(123), "fire"));

    expect(game.stage?.channel).toHaveLength(1);
    expect(game.stage?.drawPile).toHaveLength(19);
  });

  it("releasing with an empty channel changes nothing", () => {
    const game = applyPick(createGame(123), "fire");

    expect(applyRelease(game)).toBe(game);
  });

  it("releases by itself when the channel reaches 5 cards", () => {
    let game = stageGame(makeState({ drawPile: [num(1), num(2), num(3), num(4), num(5)] }));

    for (let i = 0; i < 5; i++) {
      game = applyDraw(game);
    }

    // power 15 × 3 = 45, Staff +20, Fire +20, Pierce ×1.5 = 127
    expect(game.stage?.channel).toEqual([]);
    expect(game.stage?.castsRemaining).toBe(3);
    expect(game.stage?.totalDamage).toBe(127);
    expect(game.log.some((line) => line.startsWith("Cast 1"))).toBe(true);
  });

  it("releases by itself on a backfire and uses up the cast", () => {
    let game = stageGame(makeState({ drawPile: [unstable, unstable, num(5)] }));

    game = applyDraw(game);
    game = applyDraw(game);

    expect(game.stage?.channel).toEqual([]);
    expect(game.stage?.castsRemaining).toBe(3);
    expect(game.stage?.totalDamage).toBe(0);
    expect(game.log.some((line) => line.includes("Backfire"))).toBe(true);
  });

  it("does not backfire on the second Unstable card when Earth is equipped", () => {
    const earthy: Loadout = [crackedStaff, pierce, null, null, null];
    let game = stageGame(makeState({ drawPile: [unstable, unstable, num(5)] }), earthy, 0, earth);

    game = applyDraw(game);
    game = applyDraw(game);

    expect(game.stage?.channel).toHaveLength(2);
    expect(game.stage?.castsRemaining).toBe(4);
  });
});

describe("clearing and failing stages", () => {
  const drawThree = (game: Game): Game => {
    let next = game;

    for (let i = 0; i < 3; i++) {
      next = applyDraw(next);
    }

    return applyRelease(next);
  };

  it("clearing a stage pays gold and opens the reward screen", () => {
    const game = drawThree(
      stageGame(makeState({ targetHp: 84, drawPile: [num(5), unstable, num(3)] })),
    );

    expect(game.phase).toBe("reward");
    expect(game.gold).toBe(stageClearGold(3));
    expect(game.rewardOptions).toHaveLength(3);
    expect(game.log.some((line) => line.includes("gold"))).toBe(true);
  });

  it("opens a shop after the boss and starts a stronger next round afterward", () => {
    const last = ROUND_STAGES.length - 1;
    const shop = drawThree(
      stageGame(makeState({ targetHp: 84, drawPile: [num(5), unstable, num(3)] }), reference, last),
    );

    expect(shop.phase).toBe("shop");
    expect(shop.roundNumber).toBe(1);
    expect(shop.stageIndex).toBe(last);
    expect(shop.shopOffers.length).toBeGreaterThan(0);
    expect(shop.log.some((line) => line.includes("Visit the shop before Round 2"))).toBe(true);

    const nextRound = applyNextStage(shop);

    expect(nextRound.phase).toBe("stage");
    expect(nextRound.roundNumber).toBe(2);
    expect(nextRound.stageIndex).toBe(0);
    expect(nextRound.stage?.name).toBe(ROUND_STAGES[0]?.name);
    expect(nextRound.stage?.targetHp).toBeGreaterThanOrEqual(
      ROUND_STAGES[0]!.hp.minValue + ROUND_STAGES[0]!.hpGrowthPerRound.minValue,
    );
    expect(nextRound.stage?.targetHp).toBeLessThanOrEqual(
      ROUND_STAGES[0]!.hp.maxValue + ROUND_STAGES[0]!.hpGrowthPerRound.maxValue,
    );
    expect(nextRound.log.some((line) => line.includes("Round 2 · Stage 1/3"))).toBe(true);
  });

  it("running out of casts loses the run", () => {
    const game = drawThree(
      stageGame(makeState({ targetHp: 1000, castsRemaining: 1, drawPile: [num(5), unstable, num(3)] })),
    );

    expect(game.phase).toBe("lost");
    expect(applyDraw(game)).toBe(game);
  });
});

describe("the reward screen", () => {
  it("choosing a card holds it until a slot is chosen, then the shop opens", () => {
    const holding = applyChooseReward(rewardGame(), 0);

    expect(holding.pendingCard?.card).toBe(hex);
    expect(holding.phase).toBe("reward");

    const placed = applySelectSlot(holding, 1);

    expect(placed.loadout[1]).toBe(hex);
    expect(placed.pendingCard).toBe(null);
    expect(placed.phase).toBe("shop");
    expect(placed.shopOffers.length).toBeGreaterThan(0);
    expect(placed.log.some((line) => line.includes("replacing Pierce"))).toBe(true);
  });

  it("choosing a deck change applies it and opens the shop", () => {
    const game = applyChooseReward(rewardGame(), 1);

    expect(game.deck).toHaveLength(21);
    expect(game.deck.at(-1)).toEqual(num(9));
    expect(game.phase).toBe("shop");
  });

  it("skipping gives gold and opens the shop", () => {
    const game = applySkipReward(rewardGame({ gold: 5 }));

    expect(game.gold).toBe(5 + SKIP_REWARD_GOLD);
    expect(game.phase).toBe("shop");
  });

  it("a held card can be cancelled and another reward chosen", () => {
    const holding = applyChooseReward(rewardGame(), 0);
    const cancelled = applyCancelPending(holding);

    expect(cancelled.pendingCard).toBe(null);
    expect(cancelled.phase).toBe("reward");
    expect(applyChooseReward(cancelled, 1).phase).toBe("shop");
  });

  it("does not take another reward while holding a card, or for a missing option", () => {
    const holding = applyChooseReward(rewardGame(), 0);

    expect(applyChooseReward(holding, 1)).toBe(holding);
    expect(applySkipReward(holding)).toBe(holding);
    expect(applyChooseReward(rewardGame(), 7)).toEqual(rewardGame());
  });

  it("cannot place a card into a locked slot", () => {
    const holding = applyChooseReward(rewardGame(), 0);

    expect(applySelectSlot(holding, 3)).toBe(holding);
    expect(applySelectSlot(holding, 4)).toBe(holding);
  });
});

describe("the shop", () => {
  it("buying a card holds it, and paying happens when it is placed", () => {
    const holding = applyBuy(shopGame(), 0);

    expect(holding.pendingCard).toEqual({ card: hex, cost: 20, source: "shop", offerIndex: 0 });
    expect(holding.gold).toBe(100);

    const placed = applySelectSlot(holding, 2);

    expect(placed.loadout[2]).toBe(hex);
    expect(placed.gold).toBe(80);
    expect(placed.shopOffers).toHaveLength(2);
    expect(placed.phase).toBe("shop");
  });

  it("cannot buy without enough gold", () => {
    const game = shopGame({ gold: 10 });

    expect(applyBuy(game, 0)).toBe(game);
  });

  it("sells any occupied loadout slot for 5 gold", () => {
    const before = shopGame({ selectedSlot: 1 });
    const sold = applySellCard(before, 0);

    expect(sold.loadout[0]).toBe(null);
    expect(sold.loadout[1]).toBe(pierce);
    expect(sold.gold).toBe(100 + SELL_CARD_PRICE);
    expect(sold.selectedSlot).toBe(null);
    expect(sold.log.at(-1)).toContain(`for ${SELL_CARD_PRICE} gold`);
  });

  it("does not sell outside the shop, during a pending purchase, or from invalid slots", () => {
    const game = shopGame();
    const pending = applyBuy(game, 0);
    const inStage = { ...game, phase: "stage" as const };

    expect(applySellCard(inStage, 0)).toBe(inStage);
    expect(applySellCard(pending, 0)).toBe(pending);
    expect(applySellCard(game, -1)).toBe(game);
    expect(applySellCard(game, game.unlockedSlots)).toBe(game);
    expect(applySellCard(game, 2)).toBe(game);
  });

  it("cannot sell an element even if one is incorrectly present in a loadout", () => {
    const game = shopGame({ loadout: [earth, null, null, null, null] });

    expect(applySellCard(game, 0)).toBe(game);
  });

  it("buying an Unstable removal changes the deck", () => {
    const game = applyBuy(shopGame(), 1);

    expect(game.deck).toHaveLength(19);
    expect(game.deck.filter((card) => card.kind === "unstable")).toHaveLength(5);
    expect(game.gold).toBe(85);
    expect(game.shopOffers).toHaveLength(2);
  });

  it("buying a slot unlock opens the next slot for cards", () => {
    const game = applyBuy(shopGame(), 2);

    expect(game.unlockedSlots).toBe(4);
    expect(game.gold).toBe(75);
    expect(game.shopOffers).toHaveLength(2);
    expect(applySelectSlot(game, 3).selectedSlot).toBe(3);
  });

  it("leaving the shop starts the next stage with the run's deck", () => {
    const game = applyNextStage(shopGame({ deck: [...createGame(1).deck, num(9)] }));

    expect(game.phase).toBe("stage");
    expect(game.stageIndex).toBe(1);
    expect(game.stage?.name).toBe(ROUND_STAGES[1]?.name);
    expect(game.stage?.targetHp).toBeGreaterThanOrEqual(ROUND_STAGES[1]!.hp.minValue);
    expect(game.stage?.targetHp).toBeLessThanOrEqual(ROUND_STAGES[1]!.hp.maxValue);
    expect(game.stage?.rule).toBeNull();
    expect(game.stage?.status).toBe("ready");
    expect(game.stage?.drawPile).toHaveLength(21);
    expect(game.stage?.stacks).toEqual({});
  });

  it("chooses a seeded boss rule when entering the boss stage", () => {
    const enteringBoss = shopGame({ stageIndex: 1, seed: 123 });
    const game = applyNextStage(enteringBoss);
    const replay = applyNextStage(enteringBoss);

    expect(game.stageIndex).toBe(2);
    expect(BOSS_RULES).toContainEqual(game.stage?.rule);
    expect(game.log.at(-1)).toContain("Rule:");
    expect(game).toEqual(replay);
  });

  it("adds a seeded HP increase to the boss in later rounds", () => {
    const game = applyNextStage(shopGame({ stageIndex: 1, roundNumber: 2, seed: 42 }));
    const boss = ROUND_STAGES.at(-1)!;

    expect(game.stage?.name).toBe(boss.name);
    expect(game.stage?.targetHp).toBeGreaterThanOrEqual(
      boss.hp.minValue + boss.hpGrowthPerRound.minValue,
    );
    expect(game.stage?.targetHp).toBeLessThanOrEqual(
      boss.hp.maxValue + boss.hpGrowthPerRound.maxValue,
    );
  });

  it("cannot leave the shop while holding a card, or outside the shop", () => {
    const holding = applyBuy(shopGame(), 0);
    const inStage = stageGame();

    expect(applyNextStage(holding)).toBe(holding);
    expect(applyNextStage(inStage)).toBe(inStage);
  });
});

describe("reordering the loadout", () => {
  it("selecting two slots swaps them and logs it", () => {
    let game = stageGame();

    game = applySelectSlot(game, 0);
    expect(game.selectedSlot).toBe(0);

    game = applySelectSlot(game, 2);
    expect(game.loadout).toEqual([null, pierce, crackedStaff, null, null]);
    expect(game.selectedSlot).toBe(null);
    expect(game.log.at(-1)).toContain("Swapped slot 1");
  });

  it("selecting the same slot again clears the selection", () => {
    const game = applySelectSlot(applySelectSlot(stageGame(), 1), 1);

    expect(game.selectedSlot).toBe(null);
    expect(game.loadout).toEqual(reference);
  });

  it("changes the score when swapping the loadout cards around the fixed element", () => {
    let game = stageGame(makeState({ drawPile: [num(5), unstable, num(3)] }));
    game = applySelectSlot(applySelectSlot(game, 0), 2); // fixed Fire, then Pierce, then Staff

    for (let i = 0; i < 3; i++) {
      game = applyDraw(game);
    }
    // 16 +20 = 36, ×1.5 = 54, +20 = 74
    expect(applyRelease(game).stage?.totalDamage).toBe(74);
  });

  it("is blocked while the channel has cards", () => {
    const game = applyDraw(stageGame(makeState({ drawPile: [num(1), num(2)] })));

    expect(applySelectSlot(game, 0)).toBe(game);
  });

  it("works on the reward and shop screens too, but not on a locked slot", () => {
    expect(applySelectSlot(rewardGame(), 1).selectedSlot).toBe(1);
    expect(applySelectSlot(shopGame(), 1).selectedSlot).toBe(1);
    expect(applySelectSlot(shopGame(), 3).selectedSlot).toBe(null);
  });
});

describe("rulesFor", () => {
  it("combines the loadout and the stage rule", () => {
    const game = stageGame(
      makeState({ rule: { kind: "multiplierCap", max: 2 } }),
      [null, null, null, null, null],
      0,
      earth,
    );
    const rules = rulesFor(game);

    expect(rules.unstableLimit).toBe(3);
    expect(rules.multiplierCap).toBe(2);
  });
});

describe("a whole run", () => {
  it("can be played from the element pick to a won or lost ending", () => {
    for (const seed of [1, 42, 777]) {
      let game = applyPick(createGame(seed), "fire");

      for (let step = 0; step < 1000 && game.phase !== "lost"; step++) {
        if (game.phase === "reward") {
          game = applySkipReward(game);
        } else if (game.phase === "shop") {
          game = applyNextStage(game);
        } else if (game.stage !== null && game.stage.channel.length >= 3) {
          game = applyRelease(game);
        } else {
          game = applyDraw(game);
        }
      }

      expect(game.phase).toBe("lost");
    }
  });

  it("can also be played taking rewards and buying in every shop", () => {
    let game = applyPick(createGame(5), "earth");

    for (let step = 0; step < 1000 && game.phase !== "lost"; step++) {
      if (game.phase === "reward") {
        // take the deck change (the last option) so no slot has to be chosen
        game = applyChooseReward(game, game.rewardOptions.length - 1);
      } else if (game.phase === "shop") {
        game = applyCancelPending(applyBuy(game, game.shopOffers.length - 1));
        game = applyNextStage(game);
      } else if (game.stage !== null && game.stage.channel.length >= 3) {
        game = applyRelease(game);
      } else {
        game = applyDraw(game);
      }
    }

    expect(game.phase).toBe("lost");
  });
});
