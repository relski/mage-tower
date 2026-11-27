import { describeRule } from "../../core/rules";
import type { StageState } from "../../core/types";
import { ROUND_STAGES } from "../../data/stages/rounds";
import type { Game } from "../../state/game";
import { escapeHtml } from "../html";

// round, stage, element, enemy HP meter, casts left and gold.
// Only the reward and shop screens use it now; the stage screen has the player panel and the enemy tab.
export function summaryPanel(game: Game, stage: StageState): string {
  const rule = stage.rule !== null ? `<p>Rule: ${escapeHtml(describeRule(stage.rule))}</p>` : "";
  const remainingHp = Math.max(0, stage.targetHp - stage.totalDamage);

  return `
    <section class="panel">
      <p>Round ${game.roundNumber} · Stage ${game.stageIndex + 1}/${ROUND_STAGES.length} · ${escapeHtml(stage.name)}</p>
      <p>Element ${escapeHtml(game.element?.name ?? "none")}</p>
      <div class="damage-meter">
        <label for="stage-hp">Enemy HP ${remainingHp} / ${stage.targetHp}</label>
        <meter id="stage-hp" min="0" max="${stage.targetHp}" value="${remainingHp}">
          ${remainingHp} of ${stage.targetHp}
        </meter>
      </div>
      <p>Casts left ${stage.castsRemaining} · Gold ${game.gold}</p>
      ${rule}
    </section>`;
}
