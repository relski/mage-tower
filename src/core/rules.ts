import type { Card, ChannelRules, Loadout, StageRule } from "./types";
import { cardsInEffectOrder } from "./loadout";
import { DEFAULT_CHANNEL_RULES } from "../data/tuning";

// the channel rules for a stage: defaults, element and loadout tolerance, plus the stage rule
export function getChannelRules(
  loadout: Loadout,
  rule: StageRule | null,
  element: Card | null = null,
): ChannelRules {
  let unstableLimit = DEFAULT_CHANNEL_RULES.unstableLimit;
  let multiplierCap = DEFAULT_CHANNEL_RULES.multiplierCap;
  let halfValueAbove = DEFAULT_CHANNEL_RULES.halfValueAbove;

  for (const card of cardsInEffectOrder(loadout, element)) {
    if (card === null) {
      continue;
    }

    for (const effect of card.effects) {
      if (effect.action.kind === "addUnstableTolerance" && effect.trigger.kind === "always") {
        unstableLimit += effect.action.value;
      }
    }
  }

  if (rule !== null) {
    switch (rule.kind) {
      case "unstableLimitDelta":
        unstableLimit += rule.value;
        break;
      case "multiplierCap":
        multiplierCap = rule.max;
        break;
      case "halfValueAbove":
        halfValueAbove = rule.threshold;
        break;
    }
  }

  // a channel can never backfire before its first Unstable card is even drawn
  return { unstableLimit: Math.max(1, unstableLimit), multiplierCap, halfValueAbove };
}

// one line of text for the UI
export function describeRule(rule: StageRule): string {
  switch (rule.kind) {
    case "unstableLimitDelta": {
      const amount = Math.abs(rule.value);
      const noun = amount === 1 ? "Unstable card" : "Unstable cards";
      return rule.value < 0
        ? `Backfire ${amount} ${noun} sooner`
        : `Backfire ${amount} ${noun} later`;
    }
    case "multiplierCap":
      return `Channel multiplier is capped at ×${rule.max}`;
    case "halfValueAbove":
      return `Number cards above ${rule.threshold} count as half value`;
  }
}
