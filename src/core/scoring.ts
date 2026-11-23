import type {
  Action,
  CastResult,
  ChannelCard,
  Loadout,
  StageState,
  TraceStep,
  Trigger,
} from "./types";
import { channelMultiplier, channelPower, isBackfired, unstableCount } from "./channel";
import { nextRandom } from "./rng";
import { getChannelRules } from "./rules";

type Stacks = StageState["stacks"];

// decides whether an effect's trigger fires on this cast.
// A chance trigger rolls the seeded RNG, so it returns the next seed too.
function evaluateTrigger(
  trigger: Trigger,
  castNumber: number,
  channel: readonly ChannelCard[],
  seed: number,
): { fires: boolean; seed: number } {
  switch (trigger.kind) {
    case "always":
      return { fires: true, seed };
    case "firstCast":
      return { fires: castNumber === 1, seed };
    case "everyNthCast":
      return { fires: castNumber % trigger.n === 0, seed };
    case "channelHasUnstable":
      return { fires: unstableCount(channel) > 0, seed };
    case "chance": {
      const roll = nextRandom(seed);
      return { fires: roll.value < trigger.p, seed: roll.seed };
    }
  }
}

// applies one action to the running damage total and stacks.
// description is null when the action changes nothing worth showing in the trace.
function applyAction(
  action: Action,
  total: number,
  stacks: Stacks,
): { total: number; stacks: Stacks; description: string | null } {
  switch (action.kind) {
    case "addDamage":
      return { total: total + action.value, stacks, description: `+${action.value} damage` };

    case "mulTotal":
      // scores stay whole numbers: round down after every multiplication
      return { total: Math.floor(total * action.value), stacks, description: `×${action.value}` };

    case "addStack": {
      const count = (stacks[action.stack] ?? 0) + 1;
      return {
        total,
        stacks: { ...stacks, [action.stack]: count },
        description: `gains a ${action.stack} stack (now ${count})`,
      };
    }

    case "addDamagePerStack": {
      const count = stacks[action.stack] ?? 0;
      const bonus = count * action.value;

      if (bonus === 0) {
        return { total, stacks, description: null };
      }

      const noun = count === 1 ? "stack" : "stacks";
      return {
        total: total + bonus,
        stacks,
        description: `+${bonus} damage (${count} ${action.stack} ${noun} × ${action.value})`,
      };
    }

    case "addUnstableTolerance":
      // a channel rule: it is applied while channeling (see rules.ts), not while scoring
      return { total, stacks, description: null };
  }
}

// resolves one cast: the channel gives the starting damage, then the loadout
// triggers left to right on the running total. Only stacks and the seed change in nextState;
// the stage bookkeeping (damage, casts, discard) happens in round.ts.
export function resolveCast(loadout: Loadout, state: StageState): CastResult {
  const { channel } = state;

  if (channel.length === 0) {
    throw new Error("Cannot cast with an empty channel");
  }

  const rules = getChannelRules(loadout, state.rule);

  if (isBackfired(channel, rules)) {
    return {
      score: 0,
      backfired: true,
      trace: [
        {
          source: "Channel",
          description: `Backfire! ${unstableCount(channel)} Unstable cards`,
          total: 0,
        },
      ],
      nextState: state,
    };
  }

  const power = channelPower(channel, rules);
  const multiplier = channelMultiplier(channel.length, rules);
  const capped = multiplier < channelMultiplier(channel.length);

  let total = Math.floor(power * multiplier);
  let stacks = state.stacks;
  let seed = state.seed;

  const trace: TraceStep[] = [
    {
      source: "Channel",
      description: `power ${power} × ${multiplier} (${channel.length} cards${capped ? ", capped" : ""})`,
      total,
    },
  ];

  for (const card of loadout) {
    if (card === null) {
      continue;
    }

    for (const effect of card.effects) {
      const trigger = evaluateTrigger(effect.trigger, state.castNumber, channel, seed);
      seed = trigger.seed;

      if (!trigger.fires) {
        continue;
      }

      const result = applyAction(effect.action, total, stacks);
      total = result.total;
      stacks = result.stacks;

      if (result.description !== null) {
        const lucky = effect.trigger.kind === "chance" ? " (lucky roll)" : "";
        trace.push({ source: card.name, description: result.description + lucky, total });
      }
    }
  }

  return {
    score: total,
    backfired: false,
    trace,
    nextState: { ...state, stacks, seed },
  };
}
