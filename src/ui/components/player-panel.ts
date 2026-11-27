import type { Game } from "../../state/game";
import { escapeHtml } from "../html";
import { elementIcon, icon } from "../icons";

// The player panel: one row with the chosen element (icon and name, tinted by the element),
// gold (coin icon and number), and a menu button. The menu holds the seed and Abandon run.
export function playerPanel(game: Game, menuOpen: boolean): string {
  const element = game.element;
  const chip =
    element === null
      ? ""
      : `<span class="element-chip" data-element="${escapeHtml(element.id)}">${elementIcon(element.id)}${escapeHtml(element.name)}</span>`;

  const abandon =
    game.phase === "lost"
      ? ""
      : `<button class="small" data-action="abandon">Abandon run</button>`;

  const menu = menuOpen
    ? `
      <div class="game-menu" id="game-menu">
        <p class="muted">Seed ${game.startSeed}</p>
        ${abandon}
      </div>`
    : "";

  return `
    <section class="panel player-panel">
      ${chip}
      <span class="gold">${icon("coin")}<span class="sr-only">Gold </span>${game.gold}</span>
      <button class="icon-button" data-action="menu" aria-label="Menu" aria-expanded="${menuOpen}"${menuOpen ? ` aria-controls="game-menu"` : ""}>${icon("menu")}</button>
      ${menu}
    </section>`;
}
