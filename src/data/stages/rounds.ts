import type { StageConfig } from "../../core/types";
import { towerWarden } from "./bosses";
import { goblinScout, stoneOgre } from "./enemies";

// the stages repeated each round, in order: easy mob, medium enemy, round boss
export const ROUND_STAGES: readonly StageConfig[] = [goblinScout, stoneOgre, towerWarden];
