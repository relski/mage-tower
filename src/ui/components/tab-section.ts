import type { StageState } from "../../core/types";
import type { Game } from "../../state/game";
import { icon } from "../icons";
import type { IconName } from "../icons";
import type { UiState } from "../ui-state";
import { isLocked } from "../ui-state";
import { enemyPanel } from "./enemy-panel";
import { loadoutPanel } from "./loadout-panel";
import { logPanel } from "./log-panel";

export type TabName = "log" | "enemy" | "loadout";

// the tab shown when a stage starts and after every draw and release, so the enemy's HP is in view
export const DEFAULT_TAB: TabName = "enemy";

// in the order the tabs appear
const TABS: readonly { name: TabName, label: string, icon: IconName }[] = [
  { name: "log", label: "Combat log", icon: "log" },
  { name: "enemy", label: "Enemy", icon: "enemy" },
  { name: "loadout", label: "Loadout", icon: "loadout" },
];

export function isTabName(value: unknown): value is TabName {
  return TABS.some((tab) => tab.name === value);
}

// The panels that fill a tab. The enemy view and the loadout are final; the combat log is
// the log panel.
function tabContent(tab: TabName, game: Game, stage: StageState, ui: UiState): string {
  switch (tab) {
    case "log":
      return logPanel(game);
    case "enemy":
      return enemyPanel(game, stage, ui.cast);
    case "loadout":
      return loadoutPanel(game, { locked: isLocked(ui) });
  }
}

// A row of icon tabs above one content area. Which tab is selected is UI state kept by the app;
// this only draws it.
export function tabSection(game: Game, stage: StageState, ui: UiState): string {
  const activeTab = ui.activeTab;

  const buttons = TABS.map((tab) => {
    const selected = tab.name === activeTab;

    return `
        <button class="tab" role="tab" id="tab-${tab.name}" data-action="tab" data-tab="${tab.name}"
          aria-selected="${selected}" aria-controls="tab-body" aria-label="${tab.label}" title="${tab.label}">
          ${icon(tab.icon)}
        </button>`;
  }).join("");

  return `
    <section class="tab-section">
      <div class="tabs" role="tablist" aria-label="Stage information">${buttons}
      </div>
      <div class="tab-body" id="tab-body" role="tabpanel" aria-labelledby="tab-${activeTab}" data-scroll-key="stage-${activeTab}">
        ${tabContent(activeTab, game, stage, ui)}
      </div>
    </section>`;
}
