import { unstableCount } from "../core/channel";
import { createStartingLoadout, swapSlots } from "../core/loadout";
import {
  canDraw,
  canRelease,
  createStage,
  drawIntoChannel,
  releaseCast,
  shouldAutoRelease,
} from "../core/round";
import { pickRandom, randomInteger } from "../core/rng";
import { describeRule, getChannelRules } from "../core/rules";
import {
  applyDeckReward,
  createRewardOptions,
  createShopOffers,
  describeReward,
  placeCard,
  removeUnstableCard,
  stageClearGold,
} from "../core/run";
import type { RewardOption, ShopOffer } from "../core/run";
import type {
  Card,
  ChannelCard,
  ChannelRules,
  Loadout,
  StageConfig,
  StageSetup,
  StageState,
  TraceStep,
} from "../core/types";
import { ELEMENTS } from "../data/cards/elements";
import { ITEMS } from "../data/cards/items";
import { MODIFIERS } from "../data/cards/modifiers";
import { createStartingDeck } from "../data/channel-deck";
import { BOSS_RULES } from "../data/stages/bosses";
import { ROUND_STAGES } from "../data/stages/rounds";
import {
  DEFAULT_CHANNEL_RULES,
  SELL_CARD_PRICE,
  SKIP_REWARD_GOLD,
  STARTING_UNLOCKED_SLOTS,
} from "../data/tuning";

// "pick": choosing the starting element, "stage": playing a stage,
// "reward": picking a reward after a stage, "shop": spending gold before the next stage,
// "lost": a stage was failed
export type Phase = "pick" | "stage" | "reward" | "shop" | "lost";

// a card the player has taken (or is buying) and still has to place in a slot
export type PendingCard = {
  card: Card;
  cost: number;                  // gold to pay when it is placed (0 for a reward)
  source: "reward" | "shop";
  offerIndex: number;
};

export type Game = {
  phase: Phase;
  startSeed: number;             // shown in the UI so a run can be repeated
  seed: number;                  // RNG state outside of a stage
  roundNumber: number;           // current wave number, starting at 1
  stageIndex: number;            // index into ROUND_STAGES
  element: Card | null;          // immutable for the run, outside the loadout
  loadout: Loadout;
  unlockedSlots: number;
  deck: ChannelCard[];           // the run's channel deck; each stage starts from it
  gold: number;
  stage: StageState | null;      // null while picking the element
  rewardOptions: RewardOption[];
  shopOffers: ShopOffer[];
  pendingCard: PendingCard | null;
  selectedSlot: number | null;   // first slot chosen for a swap
  log: string[];
};

// pure functions: each takes a game and returns the next one

export function createGame(seed: number): Game {
  return {
    phase: "pick",
    startSeed: seed,
    seed,
    roundNumber: 1,
    stageIndex: 0,
    element: null,
    loadout: [null, null, null, null, null],
    unlockedSlots: STARTING_UNLOCKED_SLOTS,
    deck: createStartingDeck(),
    gold: 0,
    stage: null,
    rewardOptions: [],
    shopOffers: [],
    pendingCard: null,
    selectedSlot: null,
    log: ["Choose your element."],
  };
}

// the channel rules in effect right now (loadout + stage rule)
export function rulesFor(game: Game): ChannelRules {
  return game.stage
    ? getChannelRules(game.loadout, game.stage.rule, game.element)
    : DEFAULT_CHANNEL_RULES;
}

function stageIntro(config: StageSetup, index: number, roundNumber: number): string[] {
  const lines = [
    `Round ${roundNumber} · Stage ${index + 1}/${ROUND_STAGES.length}: ${config.name} (HP ${config.hp}, ${config.casts} casts)`,
  ];

  if (config.rule !== null) {
    lines.push(`Rule: ${describeRule(config.rule)}`);
  }

  return lines;
}

function startStage(
  stageIndex: number,
  roundNumber: number,
  deck: readonly ChannelCard[],
  seed: number,
): { config: StageSetup; stage: StageState; seed: number } {
  const definition: StageConfig | undefined = ROUND_STAGES[stageIndex];

  if (definition === undefined) {
    throw new Error(`No stage is configured at index ${stageIndex}`);
  }

  const baseHp = randomInteger(definition.hp.minValue, definition.hp.maxValue, seed);
  let nextSeed = baseHp.seed;
  let hp = baseHp.value;

  for (let round = 1; round < roundNumber; round++) {
    const growth = randomInteger(
      definition.hpGrowthPerRound.minValue,
      definition.hpGrowthPerRound.maxValue,
      nextSeed,
    );
    hp += growth.value;
    nextSeed = growth.seed;
  }

  let rule = definition.rule;

  if (stageIndex === ROUND_STAGES.length - 1) {
    const bossRule = pickRandom(BOSS_RULES, nextSeed);
    rule = bossRule.value;
    nextSeed = bossRule.seed;
  }

  const config: StageSetup = {
    name: definition.name,
    hp,
    casts: definition.casts,
    rule,
  };

  return {
    config,
    stage: createStage(config, deck, nextSeed),
    seed: nextSeed,
  };
}

function formatStep(step: TraceStep): string {
  return `  ${step.source}: ${step.description} → ${step.total}`;
}

// choose the starting element: the loadout is built and the first stage begins
export function applyPick(game: Game, elementId: string): Game {
  if (game.phase !== "pick") {
    return game;
  }

  const element = ELEMENTS.find((card) => card.id === elementId);

  if (element === undefined) {
    return game;
  }

  const start = createStartingLoadout(MODIFIERS, ITEMS, game.seed);
  const firstStage = startStage(0, 1, game.deck, start.seed);

  return {
    ...game,
    phase: "stage",
    seed: firstStage.seed,
    stageIndex: 0,
    roundNumber: 1,
    element,
    loadout: start.loadout,
    stage: firstStage.stage,
    selectedSlot: null,
    log: [
      ...game.log,
      `You chose ${element.name}.`,
      `Random modifier: ${start.loadout[1]?.name ?? "none"}. Random item: ${start.loadout[0]?.name ?? "none"}.`,
      ...stageIntro(firstStage.config, 0, 1),
    ],
  };
}

// the shop opens after the reward pick (or after skipping it)
function enterShop(game: Game): Game {
  const shop = createShopOffers(
    game.loadout,
    game.unlockedSlots,
    game.deck,
    MODIFIERS,
    ITEMS,
    game.seed,
  );

  return {
    ...game,
    phase: "shop",
    seed: shop.seed,
    shopOffers: shop.offers,
    rewardOptions: [],
    pendingCard: null,
    selectedSlot: null,
    log: [...game.log, `You enter the shop with ${game.gold} gold.`],
  };
}

export function applyRelease(game: Game): Game {
  if (game.phase !== "stage" || game.stage === null || !canRelease(game.stage)) {
    return game;
  }

  const castNumber = game.stage.castNumber;
  const result = releaseCast(game.stage, game.loadout, game.element);
  const stage = result.nextState;
  const lastStage = game.stageIndex === ROUND_STAGES.length - 1;

  const lines = [
    `Cast ${castNumber}`,
    ...result.trace.map(formatStep),
    result.backfired
      ? `Cast ${castNumber} scores 0.`
      : `Cast ${castNumber} deals ${result.score} damage.`,
    `Damage: ${stage.totalDamage} / ${stage.targetHp}`,
  ];

  const next: Game = { ...game, stage, selectedSlot: null };

  if (stage.status === "failed") {
    lines.push("Out of casts. The run is over.");
    return { ...next, phase: "lost", log: [...game.log, ...lines] };
  }

  if (stage.status === "cleared") {
    if (lastStage) {
      const roundNumber = game.roundNumber + 1;
      lines.push(
        `${stage.name} is down. Round ${game.roundNumber} cleared.`,
        `Visit the shop before Round ${roundNumber}.`,
      );

      return enterShop({
        ...next,
        seed: stage.seed,
        log: [...game.log, ...lines],
      });
    }

    // a cleared stage pays gold and offers a reward pick; the rng continues from the stage
    const earned = stageClearGold(stage.castsRemaining);
    const rewards = createRewardOptions(game.loadout, game.deck, MODIFIERS, ITEMS, stage.seed);

    lines.push(`${stage.name} is down. You earn ${earned} gold.`, "Choose a reward.");

    return {
      ...next,
      phase: "reward",
      gold: game.gold + earned,
      seed: rewards.seed,
      rewardOptions: rewards.options,
      log: [...game.log, ...lines],
    };
  }

  return { ...next, log: [...game.log, ...lines] };
}

export function applyDraw(game: Game): Game {
  if (game.phase !== "stage" || game.stage === null) {
    return game;
  }

  const rules = rulesFor(game);

  if (!canDraw(game.stage, rules)) {
    return game;
  }

  const result = drawIntoChannel(game.stage, rules);
  const count = unstableCount(result.nextState.channel);

  const label =
    result.card.kind === "unstable"
      ? `Draw: Unstable (${count}/${rules.unstableLimit})`
      : `Draw: ${result.card.value}`;

  const lines = result.backfired ? [label, "Backfire! Too many Unstable cards."] : [label];
  const next: Game = {
    ...game,
    stage: result.nextState,
    selectedSlot: null,
    log: [...game.log, ...lines],
  };

  return next.stage !== null && shouldAutoRelease(next.stage, rules) ? applyRelease(next) : next;
}

// reward pick: a card goes to a slot (the player chooses which), a deck change happens at once
export function applyChooseReward(game: Game, index: number): Game {
  if (game.phase !== "reward" || game.pendingCard !== null) {
    return game;
  }

  const option = game.rewardOptions[index];

  if (option === undefined) {
    return game;
  }

  if (option.kind === "card") {
    return {
      ...game,
      pendingCard: { card: option.card, cost: 0, source: "reward", offerIndex: index },
      selectedSlot: null,
      log: [...game.log, `Choose a slot for ${option.card.name}.`],
    };
  }

  const deck = applyDeckReward(game.deck, option);

  return enterShop({
    ...game,
    deck,
    log: [...game.log, `Reward: ${describeReward(option)}.`],
  });
}

export function applySkipReward(game: Game): Game {
  if (game.phase !== "reward" || game.pendingCard !== null) {
    return game;
  }

  return enterShop({
    ...game,
    gold: game.gold + SKIP_REWARD_GOLD,
    log: [...game.log, `You skip the reward and take ${SKIP_REWARD_GOLD} gold.`],
  });
}

// buying: a card needs a slot, so it waits as a pending card; other offers happen at once
export function applyBuy(game: Game, index: number): Game {
  if (game.phase !== "shop" || game.pendingCard !== null) {
    return game;
  }

  const offer = game.shopOffers[index];

  if (offer === undefined || game.gold < offer.price) {
    return game;
  }

  const remaining = game.shopOffers.filter((_, i) => i !== index);

  switch (offer.kind) {
    case "card":
      return {
        ...game,
        pendingCard: { card: offer.card, cost: offer.price, source: "shop", offerIndex: index },
        selectedSlot: null,
        log: [...game.log, `Choose a slot for ${offer.card.name} (${offer.price} gold).`],
      };

    case "removeUnstable":
      return {
        ...game,
        deck: removeUnstableCard(game.deck),
        gold: game.gold - offer.price,
        shopOffers: remaining,
        log: [...game.log, `You remove an Unstable card from your deck for ${offer.price} gold.`],
      };

    case "unlockSlot":
      if (offer.slot !== game.unlockedSlots) {
        return game;
      }

      return {
        ...game,
        unlockedSlots: game.unlockedSlots + 1,
        gold: game.gold - offer.price,
        shopOffers: remaining,
        log: [...game.log, `You unlock slot ${offer.slot + 1} for ${offer.price} gold.`],
      };
  }
}

export function applySellCard(game: Game, slot: number): Game {
  if (
    game.phase !== "shop" ||
    game.pendingCard !== null ||
    !Number.isInteger(slot) ||
    slot < 0 ||
    slot >= game.unlockedSlots
  ) {
    return game;
  }

  const card = game.loadout[slot];

  if (card === null || card === undefined || card.type === "element") {
    return game;
  }

  const loadout = [...game.loadout];
  loadout[slot] = null;

  return {
    ...game,
    loadout,
    gold: game.gold + SELL_CARD_PRICE,
    selectedSlot: null,
    log: [...game.log, `You sell ${card.name} for ${SELL_CARD_PRICE} gold.`],
  };
}

// changes of mind: drop a card that is waiting for a slot
export function applyCancelPending(game: Game): Game {
  if (game.pendingCard === null) {
    return game;
  }

  return { ...game, pendingCard: null, log: [...game.log, "You decide against it."] };
}

// places the pending card into an unlocked slot (replacing the card there)
function applyPlaceCard(game: Game, slot: number): Game {
  const pending = game.pendingCard;

  if (pending === null) {
    return game;
  }

  const placed = placeCard(game.loadout, pending.card, slot, game.unlockedSlots);
  const replaced = placed.replaced ? ` (replacing ${placed.replaced.name})` : "";

  const next: Game = {
    ...game,
    loadout: placed.loadout,
    pendingCard: null,
    selectedSlot: null,
    log: [...game.log, `Placed ${pending.card.name} in slot ${slot + 1}${replaced}.`],
  };

  if (pending.source === "reward") {
    return enterShop(next);
  }

  return {
    ...next,
    gold: next.gold - pending.cost,
    shopOffers: next.shopOffers.filter((_, i) => i !== pending.offerIndex),
  };
}

// leaving the shop starts the next stage with the run's deck
export function applyNextStage(game: Game): Game {
  if (
    game.phase !== "shop" ||
    game.pendingCard !== null
  ) {
    return game;
  }

  const startsNextRound = game.stageIndex === ROUND_STAGES.length - 1;
  const roundNumber = startsNextRound ? game.roundNumber + 1 : game.roundNumber;
  const stageIndex = startsNextRound ? 0 : game.stageIndex + 1;
  const nextStage = startStage(stageIndex, roundNumber, game.deck, game.seed);

  return {
    ...game,
    seed: nextStage.seed,
    phase: "stage",
    roundNumber,
    stageIndex,
    stage: nextStage.stage,
    shopOffers: [],
    selectedSlot: null,
    log: [...game.log, ...stageIntro(nextStage.config, stageIndex, roundNumber)],
  };
}

// slots are clicked to swap two of them, or to place a pending card.
// Only allowed while the channel is empty, so the rules cannot change mid-cast.
export function applySelectSlot(game: Game, index: number): Game {
  const reordering =
    (game.phase === "stage" && game.stage !== null && game.stage.channel.length === 0) ||
    game.phase === "reward" ||
    game.phase === "shop";

  if (!reordering || index < 0 || index >= game.unlockedSlots) {
    return game;
  }

  if (game.pendingCard !== null) {
    return applyPlaceCard(game, index);
  }

  if (game.selectedSlot === null) {
    return { ...game, selectedSlot: index };
  }

  if (game.selectedSlot === index) {
    return { ...game, selectedSlot: null };
  }

  const first = game.selectedSlot;
  const nameOf = (slot: number): string => game.loadout[slot]?.name ?? "(empty)";

  return {
    ...game,
    loadout: swapSlots(game.loadout, first, index),
    selectedSlot: null,
    log: [
      ...game.log,
      `Swapped slot ${first + 1} (${nameOf(first)}) with slot ${index + 1} (${nameOf(index)}).`,
    ],
  };
}

// the store: holds the current game and tells listeners when it changes

let current: Game = createGame(Date.now());
const listeners = new Set<() => void>();

function update(next: Game): void {
  current = next;
  listeners.forEach((listener) => listener());
}

export function getGame(): Game {
  return current;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function pick(elementId: string): void {
  update(applyPick(current, elementId));
}

export function draw(): void {
  update(applyDraw(current));
}

export function release(): void {
  update(applyRelease(current));
}

export function chooseReward(index: number): void {
  update(applyChooseReward(current, index));
}

export function skipReward(): void {
  update(applySkipReward(current));
}

export function buy(index: number): void {
  update(applyBuy(current, index));
}

export function sellCard(slot: number): void {
  update(applySellCard(current, slot));
}

export function cancelPending(): void {
  update(applyCancelPending(current));
}

export function nextStage(): void {
  update(applyNextStage(current));
}

export function selectSlot(index: number): void {
  update(applySelectSlot(current, index));
}

export function restart(): void {
  update(createGame(Date.now()));
}
