import { describeRule } from "../../core/rules";
import type { StageState } from "../../core/types";
import { ROUND_STAGES } from "../../data/stages/rounds";
import type { Game } from "../../state/game";
import { enemyArt } from "../enemy-art";
import { escapeHtml } from "../html";
import type { CastView } from "../ui-state";

// the text of the HP meter's label; the cast animation rewrites it while the meter drains
export function hpLabel(remainingHp: number, targetHp: number): string {
  return `${remainingHp} / ${targetHp} HP`;
}

// While a cast plays, this covers the picture: the running damage total as a big number, and
// what just changed it. It is decoration: the combat log has the same steps as text.
function castReadout(cast: CastView): string {
  return `
      <div class="cast-readout" aria-hidden="true">
        <div class="cast-total">${cast.total}</div>
        <div class="cast-step">${escapeHtml(cast.text)}</div>
        <div class="cast-skip">Tap to skip</div>
      </div>`;
}

// The enemy tab: a picture, the enemy's name with the round and stage ("R1 · 1/3"),
// the HP meter with numbers, and the boss rule when the stage has one.
// The picture takes the spare height and shrinks first on a short screen,
// so the name and the HP meter keep their size.
export function enemyPanel(game: Game, stage: StageState, cast: CastView | null): string {
  const remainingHp = Math.max(0, stage.targetHp - stage.totalDamage);
  const rule =
    stage.rule !== null
      ? `<p class="rule-badge">Rule: ${escapeHtml(describeRule(stage.rule))}</p>`
      : "";

  return `
    <section class="panel enemy-view">
      <div class="enemy-image${cast?.hit ? " hit" : ""}" role="img" aria-label="${escapeHtml(stage.name)}">${enemyArt(stage.name)}${cast !== null ? castReadout(cast) : ""}</div>
      <div class="enemy-title">
        <span class="enemy-name">${escapeHtml(stage.name)}</span>
        <span class="muted">R${game.roundNumber} · ${game.stageIndex + 1}/${ROUND_STAGES.length}</span>
      </div>
      <div class="damage-meter">
        <label for="stage-hp">${hpLabel(remainingHp, stage.targetHp)}</label>
        <meter id="stage-hp" min="0" max="${stage.targetHp}" value="${remainingHp}">
          ${remainingHp} of ${stage.targetHp}
        </meter>
      </div>
      ${rule}
    </section>`;
}
