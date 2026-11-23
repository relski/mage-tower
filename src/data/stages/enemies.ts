import type { StageConfig } from "../../core/types";

export const goblinScout: StageConfig = {
  name: "Goblin Scout",
  hp: { minValue: 230, maxValue: 270 },
  hpGrowthPerRound: { minValue: 20, maxValue: 30 },
  casts: 4,
  rule: null,
};

export const stoneOgre: StageConfig = {
  name: "Stone Ogre",
  hp: { minValue: 280, maxValue: 320 },
  hpGrowthPerRound: { minValue: 30, maxValue: 40 },
  casts: 4,
  rule: null,
};
