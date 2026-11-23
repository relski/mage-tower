import type { Card } from "../../core/types";

export const fire: Card = {
  id: "fire",
  name: "Fire",
  type: "element",
  description: "+20 damage, +3 per burn stack, then gain a burn stack",
  effects: [
    { trigger: { kind: "always" }, action: { kind: "addDamage", value: 20 } },
    { trigger: { kind: "always" }, action: { kind: "addDamagePerStack", stack: "burn", value: 3 } },
    { trigger: { kind: "always" }, action: { kind: "addStack", stack: "burn" } },
  ],
};

export const ice: Card = {
  id: "ice",
  name: "Ice",
  type: "element",
  description: "+15 damage, and every 3rd cast is frozen for ×3",
  effects: [
    { trigger: { kind: "always" }, action: { kind: "addDamage", value: 15 } },
    { trigger: { kind: "everyNthCast", n: 3 }, action: { kind: "mulTotal", value: 3 } },
  ],
};

export const lightning: Card = {
  id: "lightning",
  name: "Lightning",
  type: "element",
  description: "+17 damage, 25% chance of ×2, +15 damage if the channel has an Unstable card",
  effects: [
    { trigger: { kind: "always" }, action: { kind: "addDamage", value: 17 } },
    { trigger: { kind: "chance", p: 0.25 }, action: { kind: "mulTotal", value: 2 } },
    { trigger: { kind: "channelHasUnstable" }, action: { kind: "addDamage", value: 15 } },
  ],
};

export const earth: Card = {
  id: "earth",
  name: "Earth",
  type: "element",
  description: "+24 damage, and the channel backfires on one more Unstable card",
  effects: [
    { trigger: { kind: "always" }, action: { kind: "addDamage", value: 24 } },
    { trigger: { kind: "always" }, action: { kind: "addUnstableTolerance", value: 1 } },
  ],
};

export const ELEMENTS: readonly Card[] = [fire, ice, lightning, earth];
