import type { StageConfig, StageRule } from "../../core/types";

export const BOSS_RULES = [
  { kind: "multiplierCap", max: 2 },
  { kind: "unstableLimitDelta", value: -1 },
  { kind: "halfValueAbove", threshold: 5 },
] as const satisfies readonly StageRule[];

export const towerWarden: StageConfig = {
  name: "Tower Warden",
  hp: { minValue: 450, maxValue: 550 },
  hpGrowthPerRound: { minValue: 50, maxValue: 75 },
  casts: 4,
  rule: null,
};
