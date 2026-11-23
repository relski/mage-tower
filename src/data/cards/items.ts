import type { Card } from "../../core/types";

export const crackedStaff: Card = {
  id: "cracked_staff",
  name: "Cracked Staff",
  type: "item",
  description: "+20 damage on the first cast of a stage",
  effects: [
    { trigger: { kind: "firstCast" }, action: { kind: "addDamage", value: 20 } },
  ],
};

export const ironRing: Card = {
  id: "iron_ring",
  name: "Iron Ring",
  type: "item",
  description: "+12 damage on every cast",
  effects: [
    { trigger: { kind: "always" }, action: { kind: "addDamage", value: 12 } },
  ],
};

export const luckyCoin: Card = {
  id: "lucky_coin",
  name: "Lucky Coin",
  type: "item",
  description: "30% chance of +50 damage",
  effects: [
    { trigger: { kind: "chance", p: 0.3 }, action: { kind: "addDamage", value: 50 } },
  ],
};

export const staticRod: Card = {
  id: "static_rod",
  name: "Static Rod",
  type: "item",
  description: "+25 damage when the channel has an Unstable card",
  effects: [
    { trigger: { kind: "channelHasUnstable" }, action: { kind: "addDamage", value: 25 } },
  ],
};

export const emberCharm: Card = {
  id: "ember_charm",
  name: "Ember Charm",
  type: "item",
  description: "+6 damage per burn stack, then gain a burn stack",
  effects: [
    { trigger: { kind: "always" }, action: { kind: "addDamagePerStack", stack: "burn", value: 6 } },
    { trigger: { kind: "always" }, action: { kind: "addStack", stack: "burn" } },
  ],
};

export const leadWeight: Card = {
  id: "lead_weight",
  name: "Lead Weight",
  type: "item",
  description: "+25 damage on every 2nd cast",
  effects: [
    { trigger: { kind: "everyNthCast", n: 2 }, action: { kind: "addDamage", value: 25 } },
  ],
};

export const rabbitsFoot: Card = {
  id: "rabbits_foot",
  name: "Rabbit’s Foot",
  type: "item",
  description: "25% chance of +75 damage",
  effects: [
    { trigger: { kind: "chance", p: 0.25 }, action: { kind: "addDamage", value: 75 } },
  ],
};

export const fuseWire: Card = {
  id: "fuse_wire",
  name: "Fuse Wire",
  type: "item",
  description: "+60 damage on every 4th cast",
  effects: [
    { trigger: { kind: "everyNthCast", n: 4 }, action: { kind: "addDamage", value: 60 } },
  ],
};

export const hourglass: Card = {
  id: "hourglass",
  name: "Hourglass",
  type: "item",
  description: "+5 damage on every cast, and +25 more on the first cast",
  effects: [
    { trigger: { kind: "always" }, action: { kind: "addDamage", value: 5 } },
    { trigger: { kind: "firstCast" }, action: { kind: "addDamage", value: 25 } },
  ],
};

export const gamblersDie: Card = {
  id: "gamblers_die",
  name: "Gambler’s Die",
  type: "item",
  description: "50% chance of +30 damage",
  effects: [
    { trigger: { kind: "chance", p: 0.5 }, action: { kind: "addDamage", value: 30 } },
  ],
};

export const ITEMS: readonly Card[] = [
  crackedStaff,
  ironRing,
  luckyCoin,
  staticRod,
  emberCharm,
  leadWeight,
  rabbitsFoot,
  fuseWire,
  hourglass,
  gamblersDie,
];
