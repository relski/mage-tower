import type { ChannelRules } from "../core/types";

// index = cards drawn - 1
// 1 card = x1, 2 cards = x1.5, 3 = x2, 4 = x2.5, 5 = x3
export const CHANNEL_MULTIPLIERS = [1, 1.5, 2, 2.5, 3] as const;

// derived, so it can never disagree with the array above
export const MAX_CHANNEL_SIZE = CHANNEL_MULTIPLIERS.length;

// backfire happens when the unstable count in the channel REACHES this number
// (2 means the 2nd Unstable card backfires). Earth raises it, boss rules can lower it.
export const UNSTABLE_LIMIT = 2;

// the channel rules before the loadout and the stage rule change anything
export const DEFAULT_CHANNEL_RULES: ChannelRules = {
  unstableLimit: UNSTABLE_LIMIT,
  multiplierCap: null,
  halfValueAbove: null,
};

// gold, prices and slots (placeholders, tune with playtests)
export const STAGE_CLEAR_GOLD = 10;
export const UNUSED_CAST_GOLD = 5;       // extra gold for each cast left over when a stage is cleared
export const SKIP_REWARD_GOLD = 10;      // gold for skipping the reward pick
export const CARD_PRICE = 20;            // price of a modifier or item in the shop
export const SELL_CARD_PRICE = 5;
export const REMOVE_UNSTABLE_PRICE = 15;

export const STARTING_UNLOCKED_SLOTS = 3;
// price to unlock slot 4, then slot 5
export const SLOT_UNLOCK_PRICES = [25, 40] as const;

// values a reward can add to the channel deck as a new number card
export const REWARD_NUMBER_VALUES = [6, 7, 8, 9] as const;
