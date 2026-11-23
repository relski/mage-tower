import type { StageConfig } from "../../core/types";
import { towerWarden } from "./bosses";
import { goblinScout, stoneOgre } from "./enemies";

// the stages of the first round, in order: easy mob, medium enemy, round boss
export const ROUND_ONE: readonly StageConfig[] = [goblinScout, stoneOgre, towerWarden];
