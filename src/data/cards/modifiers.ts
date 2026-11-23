import type { Card } from "../../core/types";

export const pierce: Card = {
  id: "pierce",
  name: "Pierce",
  type: "modifier",
  description: "×1.5 on every cast",
  effects: [
    { trigger: { kind: "always" }, action: { kind: "mulTotal", value: 1.5 } },
  ],
};

export const twin: Card = {
  id: "twin",
  name: "Twin",
  type: "modifier",
  description: "×2 on every 2nd cast",
  effects: [
    { trigger: { kind: "everyNthCast", n: 2 }, action: { kind: "mulTotal", value: 2 } },
  ],
};

export const opener: Card = {
  id: "opener",
  name: "Opener",
  type: "modifier",
  description: "×2.5 on the first cast of a stage",
  effects: [
    { trigger: { kind: "firstCast" }, action: { kind: "mulTotal", value: 2.5 } },
  ],
};

export const hex: Card = {
  id: "hex",
  name: "Hex",
  type: "modifier",
  description: "×1.75 when the channel has an Unstable card",
  effects: [
    { trigger: { kind: "channelHasUnstable" }, action: { kind: "mulTotal", value: 1.75 } },
  ],
};

export const thrice: Card = {
  id: "thrice",
  name: "Thrice",
  type: "modifier",
  description: "×2.5 on every 3rd cast",
  effects: [
    { trigger: { kind: "everyNthCast", n: 3 }, action: { kind: "mulTotal", value: 2.5 } },
  ],
};

export const finisher: Card = {
  id: "finisher",
  name: "Finisher",
  type: "modifier",
  description: "×2.5 on every 4th cast",
  effects: [
    { trigger: { kind: "everyNthCast", n: 4 }, action: { kind: "mulTotal", value: 2.5 } },
  ],
};

export const gambler: Card = {
  id: "gambler",
  name: "Gambler",
  type: "modifier",
  description: "40% chance of ×2",
  effects: [
    { trigger: { kind: "chance", p: 0.4 }, action: { kind: "mulTotal", value: 2 } },
  ],
};

export const longshot: Card = {
  id: "longshot",
  name: "Longshot",
  type: "modifier",
  description: "25% chance of ×3",
  effects: [
    { trigger: { kind: "chance", p: 0.25 }, action: { kind: "mulTotal", value: 3 } },
  ],
};

export const fortune: Card = {
  id: "fortune",
  name: "Fortune",
  type: "modifier",
  description: "50% chance of ×1.75",
  effects: [
    { trigger: { kind: "chance", p: 0.5 }, action: { kind: "mulTotal", value: 1.75 } },
  ],
};

export const backdraft: Card = {
  id: "backdraft",
  name: "Backdraft",
  type: "modifier",
  description: "+10 damage, then ×1.5 when the channel has an Unstable card",
  effects: [
    { trigger: { kind: "always" }, action: { kind: "addDamage", value: 10 } },
    { trigger: { kind: "channelHasUnstable" }, action: { kind: "mulTotal", value: 1.5 } },
  ],
};

export const ward: Card = {
  id: "ward",
  name: "Ward",
  type: "modifier",
  description: "The channel backfires on one more Unstable card",
  effects: [
    { trigger: { kind: "always" }, action: { kind: "addUnstableTolerance", value: 1 } },
  ],
};

export const glassCannon: Card = {
  id: "glass_cannon",
  name: "Glass Cannon",
  type: "modifier",
  description: "×2.5 on every cast, but the channel backfires on one fewer Unstable card",
  effects: [
    { trigger: { kind: "always" }, action: { kind: "mulTotal", value: 2.5 } },
    { trigger: { kind: "always" }, action: { kind: "addUnstableTolerance", value: -1 } },
  ],
};

export const kindle: Card = {
  id: "kindle",
  name: "Kindle",
  type: "modifier",
  description: "+8 damage per burn stack, then gain a burn stack",
  effects: [
    { trigger: { kind: "always" }, action: { kind: "addDamagePerStack", stack: "burn", value: 8 } },
    { trigger: { kind: "always" }, action: { kind: "addStack", stack: "burn" } },
  ],
};

export const wildfire: Card = {
  id: "wildfire",
  name: "Wildfire",
  type: "modifier",
  description: "+4 damage per burn stack, then gain 2 burn stacks",
  effects: [
    { trigger: { kind: "always" }, action: { kind: "addDamagePerStack", stack: "burn", value: 4 } },
    { trigger: { kind: "always" }, action: { kind: "addStack", stack: "burn" } },
    { trigger: { kind: "always" }, action: { kind: "addStack", stack: "burn" } },
  ],
};

export const steady: Card = {
  id: "steady",
  name: "Steady",
  type: "modifier",
  description: "×1.3 on every cast",
  effects: [
    { trigger: { kind: "always" }, action: { kind: "mulTotal", value: 1.3 } },
  ],
};

export const quicken: Card = {
  id: "quicken",
  name: "Quicken",
  type: "modifier",
  description: "+40 damage on every 2nd cast",
  effects: [
    { trigger: { kind: "everyNthCast", n: 2 }, action: { kind: "addDamage", value: 40 } },
  ],
};

export const MODIFIERS: readonly Card[] = [
  pierce,
  twin,
  opener,
  hex,
  thrice,
  finisher,
  gambler,
  longshot,
  fortune,
  backdraft,
  ward,
  glassCannon,
  kindle,
  wildfire,
  steady,
  quicken,
];
