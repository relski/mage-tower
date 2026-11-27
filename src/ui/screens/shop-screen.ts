import { describeOffer } from "../../core/run";
import { ROUND_STAGES } from "../../data/stages/rounds";
import { SELL_CARD_PRICE } from "../../data/tuning";
import type { Game } from "../../state/game";
import { typeBadge } from "../components/card-type";
import { loadoutPanel } from "../components/loadout-panel";
import { playerPanel } from "../components/player-panel";
import { escapeHtml } from "../html";
import { icon } from "../icons";
import type { IconName } from "../icons";
import type { UiState } from "../ui-state";
import { screenShell } from "./screen-shell";

export type ShopTab = "buy" | "sell" | "loadout";

// the tab the shop opens on. The UI goes back to it when the shop is left, and after a bought
// card has been placed or cancelled.
export const DEFAULT_SHOP_TAB: ShopTab = "buy";

const TABS: readonly { name: ShopTab, label: string, icon: IconName }[] = [
  { name: "buy", label: "Buy", icon: "buy" },
  { name: "sell", label: "Sell", icon: "sell" },
  { name: "loadout", label: "Loadout", icon: "loadout" },
];

const ROUND_STAGE_LABELS = ["Enemy 1", "Enemy 2", "Boss"] as const;

export function isShopTab(value: unknown): value is ShopTab {
  return TABS.some((tab) => tab.name === value);
}

function roundProgress(game: Game, startsNextRound: boolean): string {
  const steps = ROUND_STAGES.map((_, index) => {
    const complete = startsNextRound || index <= game.stageIndex;
    const next = !startsNextRound && index === game.stageIndex + 1;
    const status = complete ? "complete" : next ? "next" : "upcoming";

    return `
      <li class="round-progress-step is-${status}"${next ? ` aria-current="step"` : ""}>
        <span class="round-progress-dot" aria-hidden="true"></span>
        <span>${ROUND_STAGE_LABELS[index]}</span>
        <span class="sr-only">${status === "next" ? "Next stage" : status}</span>
      </li>`;
  }).join("");

  return `<ol class="round-progress" aria-label="Round ${game.roundNumber} stages">${steps}</ol>`;
}

function buyTab(game: Game, startsNextRound: boolean): string {
  const waiting = game.pendingCard !== null;

  const offers =
    game.shopOffers.length === 0
      ? `<p class="muted">Sold out.</p>`
      : game.shopOffers
          .map((offer, index) => {
            const disabled = waiting || game.gold < offer.price ? "disabled" : "";

            return `
        <button class="choice" data-action="buy" data-index="${index}" ${disabled}>
          <span class="slot-name">${offer.price} gold${offer.kind === "card" ? typeBadge(offer.card.type) : ""}</span>
          <span class="slot-text">${escapeHtml(describeOffer(offer))}</span>
        </button>`;
          })
          .join("");

  const intro = startsNextRound
    ? `Round ${game.roundNumber} cleared. Prepare for Round ${game.roundNumber + 1}.`
    : `Round ${game.roundNumber} · Stage ${game.stageIndex + 1}/${ROUND_STAGES.length} cleared.`;

  return `
    <section class="panel">
      <h2>Shop</h2>
      <p class="muted">${intro}</p>
      <div class="choices">${offers}</div>
    </section>`;
}

function sellTab(game: Game): string {
  const waiting = game.pendingCard !== null;

  const options = game.loadout
    .map((card, slot) =>
      card !== null && card.type !== "element" && slot < game.unlockedSlots
        ? `
        <button class="choice" data-action="sell" data-slot="${slot}" ${waiting ? "disabled" : ""}>
          <span class="slot-name">Sell ${escapeHtml(card.name)}${typeBadge(card.type)}</span>
          <span class="slot-text">Receive ${SELL_CARD_PRICE} gold</span>
        </button>`
        : "",
    )
    .join("");

  return `
    <section class="panel">
      <h2>Sell a loadout card</h2>
      <div class="choices">
        ${options || `<p class="muted">No loadout cards to sell.</p>`}
      </div>
    </section>`;
}

// the content of the selected tab
function tabContent(tab: ShopTab, game: Game, startsNextRound: boolean): string {
  switch (tab) {
    case "buy":
      return buyTab(game, startsNextRound);
    case "sell":
      return sellTab(game);
    case "loadout":
      return loadoutPanel(game);
  }
}

// The shop: the player panel (with gold) and three tabs on top, the selected tab's content in the
// scrolling middle, and Next stage (or Begin Round) pinned at the bottom.
// Buying a card sends the player to the Loadout tab to place it; the UI handles that.
export function shopScreen(game: Game, ui: UiState): string {
  const waiting = game.pendingCard !== null;
  const startsNextRound = game.stageIndex === ROUND_STAGES.length - 1;
  const active = ui.shopTab;

  const tabs = TABS.map((tab) => {
    const selected = tab.name === active;

    return `
        <button class="tab" role="tab" id="shop-tab-${tab.name}" data-action="shop-tab" data-tab="${tab.name}"
          aria-selected="${selected}" aria-controls="screen-body">${icon(tab.icon)}<span>${tab.label}</span></button>`;
  }).join("");

  return screenShell({
    top: `${playerPanel(game, ui.menuOpen)}
      <div class="tabs" role="tablist" aria-label="Shop">${tabs}
      </div>`,
    body: tabContent(active, game, startsNextRound),
    scrollKey: `shop-${active}`,
    actions: `
      ${roundProgress(game, startsNextRound)}
      <div class="actions">
        <button class="action-primary" data-action="next" ${waiting ? "disabled" : ""}>
          ${startsNextRound ? `Begin Round ${game.roundNumber + 1}` : "Next stage"}
        </button>
      </div>`,
  });
}
