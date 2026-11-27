import { describe, expect, it } from "vitest";
import { makeState, num, unstable } from "../core/test-helpers";
import { ELEMENTS } from "../data/cards/elements";
import { hex } from "../data/cards/modifiers";
import { ROUND_STAGES } from "../data/stages/rounds";
import {
  applyBuy,
  applyChooseReward,
  applyDraw,
  applyPick,
  createGame,
} from "./game";
import type { Game } from "./game";
import {
  deserializeGame,
  isSaveable,
  MAX_SAVED_LOG_LINES,
  SAVE_VERSION,
  serializeGame,
} from "./save";
import type { SavedGame } from "./save";
import { loadSavedGame, persistGame, SAVE_KEY } from "./save-storage";
import type { SaveStorage } from "./save-storage";

// a run with a couple of cards already drawn
function runningGame(): Game {
  let game = applyPick(createGame(123), "fire");

  for (let i = 0; i < 2; i++) {
    game = applyDraw(game);
  }

  return game;
}

function rewardGame(): Game {
  return {
    ...applyPick(createGame(5), "ice"),
    phase: "reward",
    stage: makeState({ status: "cleared" }),
    gold: 15,
    rewardOptions: [
      { kind: "card", card: hex },
      { kind: "addNumber", value: 9 },
      { kind: "removeUnstable" },
      { kind: "removeLowestNumber" },
    ],
  };
}

function shopGame(): Game {
  return {
    ...applyPick(createGame(8), "earth"),
    phase: "shop",
    stage: makeState({ status: "cleared" }),
    gold: 100,
    shopOffers: [
      { kind: "card", card: hex, price: 20 },
      { kind: "removeUnstable", price: 15 },
      { kind: "unlockSlot", slot: 3, price: 25 },
    ],
  };
}

// what a save comes back as: the lastBackfire flash and the lastCast replay are never saved
function afterReload(game: Game): Game {
  return { ...game, lastBackfire: null, lastCast: null };
}

// the saved JSON, as it would come back out of localStorage
function roundTrip(game: Game): Game | null {
  return deserializeGame(JSON.parse(JSON.stringify(serializeGame(game, 1))));
}

// a saved copy of the game that a test can damage on purpose
function tampered(game: Game, change: (saved: SavedGame["game"]) => void): unknown {
  const saved = JSON.parse(JSON.stringify(serializeGame(game, 1))) as SavedGame;

  change(saved.game);

  return saved;
}

function memoryStorage(): SaveStorage & { items: Map<string, string> } {
  const items = new Map<string, string>();

  return {
    items,
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => {
      items.set(key, value);
    },
    removeItem: (key: string) => {
      items.delete(key);
    },
  };
}

describe("serializeGame and deserializeGame", () => {
  it("brings back a run in the middle of a stage", () => {
    const game = runningGame();

    expect(roundTrip(game)).toEqual(afterReload(game));
  });

  it("saves cards by id and loads the cards from the data files", () => {
    const game = runningGame();
    const saved = serializeGame(game, 1);
    const restored = roundTrip(game);

    expect(saved.game.element).toBe("fire");
    expect(saved.game.loadout.every((entry) => entry === null || typeof entry === "string")).toBe(true);
    expect(restored?.element).toBe(game.element);
    expect(restored?.loadout[0]).toBe(game.loadout[0]);
    expect(restored?.loadout[1]).toBe(game.loadout[1]);
  });

  it("brings back the reward screen, including a card waiting for a slot", () => {
    const game = rewardGame();
    const fullLoadout = [...game.loadout];
    fullLoadout[2] = hex;
    const holding = applyChooseReward({ ...game, loadout: fullLoadout }, 0);

    expect(roundTrip(game)).toEqual(afterReload(game));
    expect(holding.pendingCard).not.toBe(null);
    expect(roundTrip(holding)).toEqual(afterReload(holding));
  });

  it("brings back the shop, including a purchase waiting for a slot", () => {
    const game = shopGame();
    const buying = applyBuy(game, 0);

    expect(roundTrip(game)).toEqual(afterReload(game));
    expect(buying.pendingCard).not.toBe(null);
    expect(roundTrip(buying)).toEqual(afterReload(buying));
  });

  it("keeps the shuffled piles and the seed, so a reload does not change what is drawn", () => {
    const game = afterReload(runningGame());
    const restored = roundTrip(game);

    expect(restored).not.toBe(null);
    expect(applyDraw(restored!)).toEqual(applyDraw(game));
  });

  it("keeps only the newest log lines", () => {
    const lines = Array.from({ length: MAX_SAVED_LOG_LINES + 300 }, (_, i) => `line ${i}`);
    const restored = roundTrip({ ...runningGame(), log: lines });

    expect(restored?.log).toHaveLength(MAX_SAVED_LOG_LINES);
    expect(restored?.log.at(-1)).toBe(lines.at(-1));
    expect(restored?.log[0]).toBe(lines.at(-MAX_SAVED_LOG_LINES));
  });

  it("does not save the cast replay or the backfire flash", () => {
    const game = runningGame();
    const saved = serializeGame(
      {
        ...game,
        lastBackfire: [unstable],
        lastCast: {
          before: { ...game, lastCast: null },
          castNumber: 1,
          trace: [],
          score: 0,
          backfired: false,
          targetHp: 100,
          damageBefore: 0,
          damageAfter: 0,
        },
      },
      1,
    );

    expect(Object.keys(saved.game)).not.toContain("lastCast");
    expect(Object.keys(saved.game)).not.toContain("lastBackfire");
  });

  it("does not change the game it saves", () => {
    const game = runningGame();
    const before = structuredClone(game);

    serializeGame(game, 1);

    expect(game).toEqual(before);
  });
});

describe("isSaveable", () => {
  it("is true for a run in progress and false for the element pick and a lost run", () => {
    expect(isSaveable(runningGame())).toBe(true);
    expect(isSaveable(rewardGame())).toBe(true);
    expect(isSaveable(shopGame())).toBe(true);
    expect(isSaveable(createGame(1))).toBe(false);
    expect(isSaveable({ ...runningGame(), phase: "lost" })).toBe(false);
  });
});

describe("loading damaged or outdated saves", () => {
  it("rejects data that is not a save at all", () => {
    for (const value of [null, undefined, 42, "text", [], {}, { version: SAVE_VERSION }]) {
      expect(deserializeGame(value)).toBe(null);
    }
  });

  it("rejects another save version", () => {
    const saved = serializeGame(runningGame(), 1);

    expect(deserializeGame({ ...saved, version: SAVE_VERSION + 1 })).toBe(null);
  });

  it("rejects a phase that is never saved", () => {
    expect(deserializeGame(tampered(runningGame(), (g) => { g.phase = "lost"; }))).toBe(null);
    expect(deserializeGame(tampered(runningGame(), (g) => { g.phase = "pick"; }))).toBe(null);
  });

  it("rejects cards that do not exist or are the wrong type", () => {
    const game = runningGame();

    expect(deserializeGame(tampered(game, (g) => { g.loadout[2] = "no_such_card"; }))).toBe(null);
    expect(deserializeGame(tampered(game, (g) => { g.loadout[2] = "fire"; }))).toBe(null);
    expect(deserializeGame(tampered(game, (g) => { g.element = hex.id; }))).toBe(null);
    expect(deserializeGame(tampered(game, (g) => { g.element = null; }))).toBe(null);
  });

  it("rejects a card in a locked slot and a wrong number of slots", () => {
    const game = runningGame();

    expect(deserializeGame(tampered(game, (g) => { g.loadout[4] = hex.id; }))).toBe(null);
    expect(deserializeGame(tampered(game, (g) => { g.loadout.pop(); }))).toBe(null);
  });

  it("rejects numbers that cannot be right", () => {
    const game = runningGame();

    expect(deserializeGame(tampered(game, (g) => { g.gold = -1; }))).toBe(null);
    expect(deserializeGame(tampered(game, (g) => { g.gold = 1.5; }))).toBe(null);
    expect(deserializeGame(tampered(game, (g) => { g.roundNumber = 0; }))).toBe(null);
    expect(deserializeGame(tampered(game, (g) => { g.stageIndex = ROUND_STAGES.length; }))).toBe(null);
    expect(deserializeGame(tampered(game, (g) => { g.unlockedSlots = 2; }))).toBe(null);
    expect(deserializeGame(tampered(game, (g) => { g.unlockedSlots = 6; }))).toBe(null);
    expect(deserializeGame(tampered(game, (g) => { g.selectedSlot = 3; }))).toBe(null);
  });

  it("rejects a damaged stage", () => {
    const game = runningGame();

    expect(deserializeGame(tampered(game, (g) => { g.stage = null; }))).toBe(null);
    expect(deserializeGame(tampered(game, (g) => { g.stage!.channel = [num(1), num(2), num(3), num(4), num(5), num(6)]; }))).toBe(null);
    expect(deserializeGame(tampered(game, (g) => { g.stage!.drawPile = [{ kind: "wild" } as never]; }))).toBe(null);
    expect(deserializeGame(tampered(game, (g) => { g.stage!.castsRemaining = -1; }))).toBe(null);
    expect(deserializeGame(tampered(game, (g) => { g.stage!.rule = { kind: "teleport" } as never; }))).toBe(null);
  });

  it("rejects a stage that does not fit the screen", () => {
    expect(deserializeGame(tampered(runningGame(), (g) => { g.stage!.status = "cleared"; }))).toBe(null);
    expect(deserializeGame(tampered(runningGame(), (g) => { g.stage!.status = "failed"; }))).toBe(null);
    expect(deserializeGame(tampered(rewardGame(), (g) => { g.stage!.status = "ready"; }))).toBe(null);
    expect(deserializeGame(tampered(shopGame(), (g) => { g.stage!.status = "casting"; }))).toBe(null);
  });

  it("rejects damaged rewards, offers and held cards", () => {
    expect(deserializeGame(tampered(rewardGame(), (g) => { g.rewardOptions[0] = { kind: "card", cardId: "nope" }; }))).toBe(null);
    expect(deserializeGame(tampered(rewardGame(), (g) => { g.rewardOptions[1] = { kind: "addNumber", value: 1.5 }; }))).toBe(null);
    expect(deserializeGame(tampered(shopGame(), (g) => { g.shopOffers[2] = { kind: "unlockSlot", slot: 9, price: 25 }; }))).toBe(null);
    expect(deserializeGame(tampered(shopGame(), (g) => { g.shopOffers[1] = { kind: "removeUnstable", price: -5 }; }))).toBe(null);

    const held = { cardId: hex.id, cost: 0, source: "reward" as const, offerIndex: 0 };

    // a held card only exists on the screen it came from, and must point at a real option
    expect(deserializeGame(tampered(runningGame(), (g) => { g.pendingCard = held; }))).toBe(null);
    expect(deserializeGame(tampered(shopGame(), (g) => { g.pendingCard = held; }))).toBe(null);
    expect(deserializeGame(tampered(rewardGame(), (g) => { g.pendingCard = { ...held, offerIndex: 9 }; }))).toBe(null);
    expect(deserializeGame(tampered(rewardGame(), (g) => { g.pendingCard = { ...held, cardId: "nope" }; }))).toBe(null);
  });

  it("accepts a held card on its own screen", () => {
    const held = { cardId: hex.id, cost: 0, source: "reward" as const, offerIndex: 0 };

    expect(deserializeGame(tampered(rewardGame(), (g) => { g.pendingCard = held; }))).not.toBe(null);
  });

  it("knows every element, so an element save from today still loads", () => {
    for (const element of ELEMENTS) {
      const game = applyPick(createGame(1), element.id);

      expect(roundTrip(game)?.element).toBe(element);
    }
  });

  it("does not trust a log that is not text", () => {
    expect(deserializeGame(tampered(runningGame(), (g) => { g.log = [1 as never]; }))).toBe(null);
    expect(deserializeGame(tampered(runningGame(), (g) => { g.deck = [unstable, { kind: "number" } as never]; }))).toBe(null);
  });
});

describe("saving to storage", () => {
  it("saves a run in progress under the save key and loads it back", () => {
    const storage = memoryStorage();
    const game = runningGame();

    persistGame(game, storage, 111);

    expect(storage.items.has(SAVE_KEY)).toBe(true);
    expect(JSON.parse(storage.items.get(SAVE_KEY)!).savedAt).toBe(111);
    expect(loadSavedGame(storage)).toEqual(afterReload(game));
  });

  it("writes over the old save with the newest state", () => {
    const storage = memoryStorage();
    const game = runningGame();
    const later = applyDraw(afterReload(game));

    persistGame(game, storage);
    persistGame(later, storage);

    expect(loadSavedGame(storage)).toEqual(afterReload(later));
  });

  it("deletes the save when the run is lost or restarted", () => {
    const storage = memoryStorage();

    persistGame(runningGame(), storage);
    persistGame({ ...runningGame(), phase: "lost" }, storage);
    expect(storage.items.size).toBe(0);

    persistGame(runningGame(), storage);
    persistGame(createGame(1), storage);
    expect(storage.items.size).toBe(0);
  });

  it("finds nothing when there is no save, or the saved text is damaged", () => {
    const storage = memoryStorage();

    expect(loadSavedGame(storage)).toBe(null);

    storage.items.set(SAVE_KEY, "{not json");
    expect(loadSavedGame(storage)).toBe(null);

    storage.items.set(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION, game: {} }));
    expect(loadSavedGame(storage)).toBe(null);
  });

  it("keeps working when storage is missing or throws", () => {
    const broken: SaveStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("full");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };

    expect(() => persistGame(runningGame(), broken)).not.toThrow();
    expect(() => persistGame(createGame(1), broken)).not.toThrow();
    expect(loadSavedGame(broken)).toBe(null);
    expect(() => persistGame(runningGame(), null)).not.toThrow();
    expect(loadSavedGame(null)).toBe(null);
  });
});
