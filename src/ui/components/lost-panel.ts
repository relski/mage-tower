import type { StageState } from "../../core/types";
import { ROUND_STAGES } from "../../data/stages/rounds";
import type { Game } from "../../state/game";
import { escapeHtml } from "../html";

// shown on the stage screen once the run is lost: where it ended, and the gold that was left
export function lostPanel(game: Game, stage: StageState): string {
  return `
    <section class="panel lost-panel">
      <h2>Run over</h2>
      <p>You fell to ${escapeHtml(stage.name)} in Round ${game.roundNumber}, stage ${game.stageIndex + 1}/${ROUND_STAGES.length}.</p>
      <p class="muted">Gold left: ${game.gold}</p>
    </section>`;
}
