import type { ChannelCard, ChannelRules, StageState } from "./types";
import { CHANNEL_MULTIPLIERS, DEFAULT_CHANNEL_RULES, MAX_CHANNEL_SIZE } from "../data/tuning";

// how many Unstable cards are in the channel
export function unstableCount(channel: readonly ChannelCard[]): number {
  return channel.filter((card) => card.kind === "unstable").length;
}

// backfire happens when the Unstable count REACHES the limit
export function isBackfired(
  channel: readonly ChannelCard[],
  rules: ChannelRules = DEFAULT_CHANNEL_RULES,
): boolean {
  return unstableCount(channel) >= rules.unstableLimit;
}

// the sum of the number cards in the channel (Unstable cards add nothing).
// A stage rule can make high number cards count as half value (rounded down).
export function channelPower(
  channel: readonly ChannelCard[],
  rules: ChannelRules = DEFAULT_CHANNEL_RULES,
): number {
  let power = 0;

  for (const card of channel) {
    if (card.kind !== "number") {
      continue;
    }

    const halved = rules.halfValueAbove !== null && card.value > rules.halfValueAbove;
    power += halved ? Math.floor(card.value / 2) : card.value;
  }

  return power;
}

// reads the multiplier from the tuning table; a stage rule can cap it
export function channelMultiplier(
  cardsDrawn: number,
  rules: ChannelRules = DEFAULT_CHANNEL_RULES,
): number {
  const multiplier = CHANNEL_MULTIPLIERS[cardsDrawn - 1];

  if (multiplier === undefined) {
    throw new Error(`No channel multiplier for ${cardsDrawn} cards`);
  }

  return rules.multiplierCap === null ? multiplier : Math.min(multiplier, rules.multiplierCap);
}

// moves the top card of the draw pile into the channel and reports whether it caused a backfire.
// It never draws past MAX_CHANNEL_SIZE cards, after a backfire, or from an empty pile.
export function drawCard(
  state: StageState,
  rules: ChannelRules = DEFAULT_CHANNEL_RULES,
): {
  card: ChannelCard;
  backfired: boolean;
  nextState: StageState;
} {
  if (state.channel.length >= MAX_CHANNEL_SIZE) {
    throw new Error("Cannot draw: the channel is full");
  }

  if (isBackfired(state.channel, rules)) {
    throw new Error("Cannot draw: the channel has already backfired");
  }

  const card = state.drawPile[0];

  if (card === undefined) {
    throw new Error("Cannot draw: the draw pile is empty");
  }

  const channel = [...state.channel, card];

  return {
    card,
    backfired: isBackfired(channel, rules),
    nextState: {
      ...state,
      channel,
      drawPile: state.drawPile.slice(1),
    },
  };
}
