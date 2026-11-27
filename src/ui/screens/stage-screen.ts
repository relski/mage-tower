import type { StageState } from "../../core/types";
import type { Game } from "../../state/game";
import { actionBar } from "../components/action-bar";
import { channelPanel } from "../components/channel-panel";
import { lostPanel } from "../components/lost-panel";
import { playerPanel } from "../components/player-panel";
import { tabSection } from "../components/tab-section";
import type { UiState } from "../ui-state";
import { isLocked } from "../ui-state";

// the stage screen (also shown after the run is lost), built from the panels in ui/components.
// Four regions fill the screen height (see ui/styles/stage-layout.css): the player panel on top,
// the tab section (enemy, combat log, loadout) which takes the remaining height, then the
// channel (pile, discard, casts and the card slots), then the Draw and Release buttons.
export function stageScreen(game: Game, stage: StageState, ui: UiState): string {
  const lost = game.phase === "lost" ? lostPanel(game, stage) : "";

  return `
    <div class="stage-screen">
      <div class="stage-top">
        ${playerPanel(game, ui.menuOpen)}
      </div>

      ${tabSection(game, stage, ui)}

      <div class="stage-channel">
        ${channelPanel(game, stage, ui.backfirePreview)}
        ${lost}
      </div>

      <div class="stage-actions">
        ${actionBar(game, stage, isLocked(ui))}
      </div>
    </div>`;
}
