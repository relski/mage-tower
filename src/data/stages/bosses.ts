import type { StageConfig } from "../../core/types";

export const towerWarden: StageConfig = {
  name: "Tower Warden",
  hp: 300,
  casts: 4,
  rule: { kind: "multiplierCap", max: 2 },
};
