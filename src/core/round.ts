import type {
  CastResult,
  ChannelCard,
  ChannelRules,
  Loadout,
  StageConfig,
  StageState,
  StageStatus,
} from "./types";
import { drawCard, isBackfired } from "./channel";
import { shuffle } from "./rng";
import { resolveCast } from "./scoring";
import { DEFAULT_CHANNEL_RULES, MAX_CHANNEL_SIZE } from "../data/tuning";

export type DrawResult = {
  card: ChannelCard;
  backfired: boolean;
  nextState: StageState;
};

// builds a fresh stage: the deck is shuffled with the seed and the stage starts "ready"
export function createStage(
  config: StageConfig,
  deck: readonly ChannelCard[],
  seed: number,
): StageState {
  const shuffled = shuffle(deck, seed);

  return {
    name: config.name,
    rule: config.rule,
    targetHp: config.hp,
    castsRemaining: config.casts,
    castNumber: 1,
    totalDamage: 0,
    drawPile: shuffled.cards,
    discardPile: [],
    channel: [],
    stacks: {},
    status: "ready",
    seed: shuffled.seed,
  };
}

function isOver(state: StageState): boolean {
  return state.status === "cleared" || state.status === "failed";
}

// can the player draw another card right now?
// rules come from getChannelRules(loadout, state.rule); they default to the plain rules
export function canDraw(
  state: StageState,
  rules: ChannelRules = DEFAULT_CHANNEL_RULES,
): boolean {
  return (
    !isOver(state) &&
    state.channel.length < MAX_CHANNEL_SIZE &&
    !isBackfired(state.channel, rules) &&
    state.drawPile.length > 0
  );
}

// can the player release the channel right now?
export function canRelease(state: StageState): boolean {
  return !isOver(state) && state.channel.length > 0;
}

// the channel releases by itself when it is full or has backfired
export function shouldAutoRelease(
  state: StageState,
  rules: ChannelRules = DEFAULT_CHANNEL_RULES,
): boolean {
  return (
    canRelease(state) &&
    (state.channel.length >= MAX_CHANNEL_SIZE || isBackfired(state.channel, rules))
  );
}

// draws one card into the channel and marks the stage as "casting"
export function drawIntoChannel(
  state: StageState,
  rules: ChannelRules = DEFAULT_CHANNEL_RULES,
): DrawResult {
  if (isOver(state)) {
    throw new Error("Cannot draw: the stage is over");
  }

  const result = drawCard(state, rules);

  return {
    ...result,
    nextState: { ...result.nextState, status: "casting" },
  };
}

// releases the channel: scores the cast, then does the stage bookkeeping.
// This is the only place that changes castNumber and castsRemaining.
export function releaseCast(state: StageState, loadout: Loadout): CastResult {
  if (isOver(state)) {
    throw new Error("Cannot release: the stage is over");
  }

  if (state.channel.length === 0) {
    throw new Error("Cannot release: the channel is empty");
  }

  const result = resolveCast(loadout, state);

  const totalDamage = state.totalDamage + result.score;
  const castsRemaining = state.castsRemaining - 1;

  let status: StageStatus = "ready";

  if (totalDamage >= state.targetHp) {
    status = "cleared";
  } else if (castsRemaining <= 0) {
    status = "failed";
  }

  return {
    ...result,
    nextState: {
      ...result.nextState,
      totalDamage,
      castsRemaining,
      castNumber: state.castNumber + 1,
      discardPile: [...state.discardPile, ...state.channel],
      channel: [],
      status,
    },
  };
}
