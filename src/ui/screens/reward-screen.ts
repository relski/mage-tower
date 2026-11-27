import { describeReward } from "../../core/run";
import type { StageState } from "../../core/types";
import { ROUND_STAGES } from "../../data/stages/rounds";
import { SKIP_REWARD_GOLD } from "../../data/tuning";
import type { Game } from "../../state/game";
import { typeBadge } from "../components/card-type";
import { loadoutPanel } from "../components/loadout-panel";
import { playerPanel } from "../components/player-panel";
import { escapeHtml } from "../html";
import type { UiState } from "../ui-state";
import { screenShell } from "./screen-shell";

// The popup that asks before a card reward (a modifier or an item) is taken: the card, and Yes or No.
// It shows only for a card reward; the other rewards (deck changes) are taken with one tap.
function confirmPopup(game: Game, index: number | null): string {
  if (index === null) {
    return "";
  }

  const option = game.rewardOptions[index];

  if (option === undefined || option.kind !== "card") {
    return "";
  }

  const card = option.card;
  const kind = card.type === "modifier" ? "modifier" : "item";

  return `
    <div class="modal-backdrop">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <h2 id="confirm-title">Are you sure with this ${kind}?</h2>
        <div class="pending-card">
          <span class="slot-name">${escapeHtml(card.name)}${typeBadge(card.type)}</span>
          <span class="slot-text">${escapeHtml(card.description ?? "")}</span>
        </div>
        <div class="modal-actions">
          <button class="action-primary" data-action="confirm-reward">Yes</button>
          <button class="action-secondary" data-action="cancel-reward">No</button>
        </div>
      </div>
    </div>`;
}

// The reward after a cleared stage. The player panel is on top (so gold is in view), the options
// and the loadout are in the scrolling middle, and Skip is pinned at the bottom.
// Once a card reward is chosen, the options go away: only the loadout is left, to place the card.
export function rewardScreen(game: Game, stage: StageState, ui: UiState): string {
  const holding = game.pendingCard !== null;
  const loadout = loadoutPanel(game);

  const options = game.rewardOptions
    .map(
      (option, index) => `
        <button class="choice" data-action="reward" data-index="${index}">
          ${option.kind === "card" ? `<span class="slot-name">${typeBadge(option.card.type)}</span>` : ""}
          <span class="slot-text">${escapeHtml(describeReward(option))}</span>
        </button>`,
    )
    .join("");

  const rewards = `
    <section class="panel">
      <h2>Reward</h2>
      <p class="muted">Round ${game.roundNumber} · Stage ${game.stageIndex + 1}/${ROUND_STAGES.length}: ${escapeHtml(stage.name)} is down. Pick one.</p>
      <div class="choices">${options}</div>
    </section>`;

  return `${screenShell({
    top: playerPanel(game, ui.menuOpen),
    body: holding ? loadout : `${rewards}${loadout}`,
    scrollKey: holding ? "reward-placing" : "reward",
    actions: `
      <div class="actions">
        <button class="action-secondary" data-action="skip" ${holding ? "disabled" : ""}>Skip for ${SKIP_REWARD_GOLD} gold</button>
      </div>`,
  })}${confirmPopup(game, ui.confirmReward)}`;
}
