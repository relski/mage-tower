import { SLOT_COUNT } from "../core/loadout";
import type { RewardOption, ShopOffer } from "../core/run";
import type {
  Card,
  CardType,
  ChannelCard,
  Loadout,
  StageRule,
  StageState,
} from "../core/types";
import { ELEMENTS } from "../data/cards/elements";
import { ITEMS } from "../data/cards/items";
import { MODIFIERS } from "../data/cards/modifiers";
import { ROUND_STAGES } from "../data/stages/rounds";
import { MAX_CHANNEL_SIZE, STARTING_UNLOCKED_SLOTS } from "../data/tuning";
import type { Game, PendingCard, Phase } from "./game";

// Saving a run: the Game is turned into plain JSON and back.
// Cards are saved by id and looked up in the data files when loading, so a saved run
// always uses the current card data and never carries its own copy of a card.
// Pure functions only: reading and writing localStorage lives in save-storage.ts.

// bump this when the saved format changes in a way old saves cannot be read
export const SAVE_VERSION = 1;

// the log grows with every draw, so only the newest lines are kept in a save
export const MAX_SAVED_LOG_LINES = 200;

type SavedReward =
  | { kind: "card", cardId: string }
  | { kind: "addNumber", value: number }
  | { kind: "removeUnstable" }
  | { kind: "removeLowestNumber" };

type SavedOffer =
  | { kind: "card", cardId: string, price: number }
  | { kind: "removeUnstable", price: number }
  | { kind: "unlockSlot", slot: number, price: number };

type SavedPending = {
  cardId: string,
  cost: number,
  source: PendingCard["source"],
  offerIndex: number,
};

export type SavedGame = {
  version: number,
  savedAt: number,   // milliseconds since 1970
  game: {
    phase: Phase,
    startSeed: number,
    seed: number,
    roundNumber: number,
    stageIndex: number,
    element: string | null,
    loadout: (string | null)[],
    unlockedSlots: number,
    deck: ChannelCard[],
    gold: number,
    stage: StageState | null,
    rewardOptions: SavedReward[],
    shopOffers: SavedOffer[],
    pendingCard: SavedPending | null,
    selectedSlot: number | null,
    log: string[],
  },
};

// only a run in progress is saved: choosing an element has nothing to keep,
// and a lost run is over
export function isSaveable(game: Game): boolean {
  return (
    (game.phase === "stage" || game.phase === "reward" || game.phase === "shop") &&
    game.stage !== null &&
    game.element !== null
  );
}

function serializeReward(option: RewardOption): SavedReward {
  return option.kind === "card" ? { kind: "card", cardId: option.card.id } : option;
}

function serializeOffer(offer: ShopOffer): SavedOffer {
  return offer.kind === "card"
    ? { kind: "card", cardId: offer.card.id, price: offer.price }
    : offer;
}

export function serializeGame(game: Game, savedAt: number): SavedGame {
  return {
    version: SAVE_VERSION,
    savedAt,
    game: {
      phase: game.phase,
      startSeed: game.startSeed,
      seed: game.seed,
      roundNumber: game.roundNumber,
      stageIndex: game.stageIndex,
      element: game.element?.id ?? null,
      loadout: game.loadout.map((card) => card?.id ?? null),
      unlockedSlots: game.unlockedSlots,
      deck: game.deck,
      gold: game.gold,
      stage: game.stage,
      rewardOptions: game.rewardOptions.map(serializeReward),
      shopOffers: game.shopOffers.map(serializeOffer),
      pendingCard:
        game.pendingCard === null
          ? null
          : {
              cardId: game.pendingCard.card.id,
              cost: game.pendingCard.cost,
              source: game.pendingCard.source,
              offerIndex: game.pendingCard.offerIndex,
            },
      selectedSlot: game.selectedSlot,
      log: game.log.slice(-MAX_SAVED_LOG_LINES),
    },
  };
}

// loading: saved data comes from outside the program (it can be old, edited or damaged),
// so everything is checked, and anything that does not fit gives null instead of a crash

type Obj = Record<string, unknown>;

function isObject(value: unknown): value is Obj {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isArrayOf<T>(value: unknown, guard: (item: unknown) => item is T): value is T[] {
  return Array.isArray(value) && value.every(guard);
}

const CARDS_BY_ID = new Map<string, Card>(
  [...ELEMENTS, ...MODIFIERS, ...ITEMS].map((card) => [card.id, card]),
);

function findCard(id: unknown, types: readonly CardType[]): Card | null {
  if (typeof id !== "string") {
    return null;
  }

  const card = CARDS_BY_ID.get(id);

  return card !== undefined && types.includes(card.type) ? card : null;
}

function isChannelCard(value: unknown): value is ChannelCard {
  return (
    isObject(value) &&
    (value.kind === "unstable" || (value.kind === "number" && isInteger(value.value)))
  );
}

function isStageRule(value: unknown): value is StageRule {
  if (!isObject(value)) {
    return false;
  }

  switch (value.kind) {
    case "unstableLimitDelta":
      return isInteger(value.value);
    case "multiplierCap":
      return isFiniteNumber(value.max);
    case "halfValueAbove":
      return isFiniteNumber(value.threshold);
    default:
      return false;
  }
}

function isStacks(value: unknown): value is StageState["stacks"] {
  return (
    isObject(value) &&
    Object.entries(value).every(([name, count]) => name === "burn" && isInteger(count))
  );
}

function isStageState(value: unknown): value is StageState {
  return (
    isObject(value) &&
    typeof value.name === "string" &&
    (value.rule === null || isStageRule(value.rule)) &&
    isInteger(value.targetHp) &&
    isInteger(value.castsRemaining) &&
    value.castsRemaining >= 0 &&
    isInteger(value.castNumber) &&
    value.castNumber >= 1 &&
    isInteger(value.totalDamage) &&
    isArrayOf(value.drawPile, isChannelCard) &&
    isArrayOf(value.discardPile, isChannelCard) &&
    isArrayOf(value.channel, isChannelCard) &&
    value.channel.length <= MAX_CHANNEL_SIZE &&
    isStacks(value.stacks) &&
    (value.status === "ready" ||
      value.status === "casting" ||
      value.status === "cleared" ||
      value.status === "failed") &&
    isFiniteNumber(value.seed)
  );
}

function isSavedPhase(value: unknown): value is "stage" | "reward" | "shop" {
  return value === "stage" || value === "reward" || value === "shop";
}

function parseList<T>(value: unknown, parse: (item: unknown) => T | null): T[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const parsed: T[] = [];

  for (const item of value) {
    const result = parse(item);

    if (result === null) {
      return null;
    }

    parsed.push(result);
  }

  return parsed;
}

function parseReward(value: unknown): RewardOption | null {
  if (!isObject(value)) {
    return null;
  }

  switch (value.kind) {
    case "card": {
      const card = findCard(value.cardId, ["modifier", "item"]);

      return card === null ? null : { kind: "card", card };
    }
    case "addNumber":
      return isInteger(value.value) ? { kind: "addNumber", value: value.value } : null;
    case "removeUnstable":
      return { kind: "removeUnstable" };
    case "removeLowestNumber":
      return { kind: "removeLowestNumber" };
    default:
      return null;
  }
}

function parseOffer(value: unknown): ShopOffer | null {
  if (!isObject(value) || !isInteger(value.price) || value.price < 0) {
    return null;
  }

  switch (value.kind) {
    case "card": {
      const card = findCard(value.cardId, ["modifier", "item"]);

      return card === null ? null : { kind: "card", card, price: value.price };
    }
    case "removeUnstable":
      return { kind: "removeUnstable", price: value.price };
    case "unlockSlot":
      return isInteger(value.slot) && value.slot >= STARTING_UNLOCKED_SLOTS && value.slot < SLOT_COUNT
        ? { kind: "unlockSlot", slot: value.slot, price: value.price }
        : null;
    default:
      return null;
  }
}

function parsePending(
  value: unknown,
  phase: "stage" | "reward" | "shop",
  rewardCount: number,
  offerCount: number,
): PendingCard | null {
  if (
    !isObject(value) ||
    !isInteger(value.cost) ||
    value.cost < 0 ||
    !isInteger(value.offerIndex) ||
    value.offerIndex < 0
  ) {
    return null;
  }

  const card = findCard(value.cardId, ["modifier", "item"]);

  // a held card only exists on the screen it came from
  if (card === null) {
    return null;
  }

  if (value.source === "reward" && phase === "reward" && value.offerIndex < rewardCount) {
    return { card, cost: value.cost, source: "reward", offerIndex: value.offerIndex };
  }

  if (value.source === "shop" && phase === "shop" && value.offerIndex < offerCount) {
    return { card, cost: value.cost, source: "shop", offerIndex: value.offerIndex };
  }

  return null;
}

function parseLoadout(value: unknown, unlockedSlots: number): Loadout | null {
  if (!Array.isArray(value) || value.length !== SLOT_COUNT) {
    return null;
  }

  const loadout: Loadout = [];

  for (const [slot, id] of value.entries()) {
    if (id === null) {
      loadout.push(null);
      continue;
    }

    const card = findCard(id, ["modifier", "item"]);

    // locked slots cannot hold a card
    if (card === null || slot >= unlockedSlots) {
      return null;
    }

    loadout.push(card);
  }

  return loadout;
}

// turns saved data back into a Game, or returns null when it cannot be trusted
export function deserializeGame(raw: unknown): Game | null {
  if (!isObject(raw) || raw.version !== SAVE_VERSION || !isObject(raw.game)) {
    return null;
  }

  const saved = raw.game;
  const phase = saved.phase;

  if (!isSavedPhase(phase)) {
    return null;
  }

  const element = findCard(saved.element, ["element"]);

  if (
    element === null ||
    !isFiniteNumber(saved.startSeed) ||
    !isFiniteNumber(saved.seed) ||
    !isInteger(saved.roundNumber) ||
    saved.roundNumber < 1 ||
    !isInteger(saved.stageIndex) ||
    saved.stageIndex < 0 ||
    saved.stageIndex >= ROUND_STAGES.length ||
    !isInteger(saved.unlockedSlots) ||
    saved.unlockedSlots < STARTING_UNLOCKED_SLOTS ||
    saved.unlockedSlots > SLOT_COUNT ||
    !isInteger(saved.gold) ||
    saved.gold < 0 ||
    !isArrayOf(saved.deck, isChannelCard) ||
    !isStageState(saved.stage) ||
    !isArrayOf(saved.log, (line): line is string => typeof line === "string")
  ) {
    return null;
  }

  const stage = saved.stage;

  // the stage matches the screen: a cleared stage waits at the reward or the shop
  const stageIsOver = stage.status === "cleared" || stage.status === "failed";

  if (phase === "stage" ? stageIsOver : stage.status !== "cleared") {
    return null;
  }

  const loadout = parseLoadout(saved.loadout, saved.unlockedSlots);
  const rewardOptions = parseList(saved.rewardOptions, parseReward);
  const shopOffers = parseList(saved.shopOffers, parseOffer);

  if (loadout === null || rewardOptions === null || shopOffers === null) {
    return null;
  }

  const pendingCard =
    saved.pendingCard === null
      ? null
      : parsePending(saved.pendingCard, phase, rewardOptions.length, shopOffers.length);

  if (saved.pendingCard !== null && pendingCard === null) {
    return null;
  }

  let selectedSlot: number | null = null;

  if (saved.selectedSlot !== null) {
    if (
      !isInteger(saved.selectedSlot) ||
      saved.selectedSlot < 0 ||
      saved.selectedSlot >= saved.unlockedSlots
    ) {
      return null;
    }

    selectedSlot = saved.selectedSlot;
  }

  return {
    phase,
    startSeed: saved.startSeed,
    seed: saved.seed,
    roundNumber: saved.roundNumber,
    stageIndex: saved.stageIndex,
    element,
    loadout,
    unlockedSlots: saved.unlockedSlots,
    deck: saved.deck,
    gold: saved.gold,
    stage,
    rewardOptions,
    shopOffers,
    pendingCard,
    selectedSlot,
    lastBackfire: null,
    lastCast: null,
    log: saved.log,
  };
}
