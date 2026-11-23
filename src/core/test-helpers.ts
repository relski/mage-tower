import type { ChannelCard, StageState } from "./types";

// shared helpers for tests only

export function makeState(overrides: Partial<StageState> = {}): StageState {
  return {
    name: "Test Enemy",
    rule: null,
    targetHp: 150,
    castsRemaining: 4,
    castNumber: 1,
    totalDamage: 0,
    drawPile: [],
    discardPile: [],
    channel: [],
    stacks: {},
    status: "ready",
    seed: 1,
    ...overrides,
  };
}

export function num(value: number): ChannelCard {
  return { kind: "number", value };
}

export const unstable: ChannelCard = { kind: "unstable" };
