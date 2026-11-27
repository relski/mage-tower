import { ELEMENTS } from "../../data/cards/elements";
import type { Game } from "../../state/game";
import { escapeHtml } from "../html";
import { elementIcon } from "../icons";
import { screenShell } from "./screen-shell";

// The first screen of a run: the four elements as cards in their colors, one under the other
// (their descriptions are long, so a grid would be cramped). Tapping one starts the run.
export function pickScreen(game: Game): string {
  const cards = ELEMENTS.map(
    (card) => `
      <button class="element-row" data-action="pick" data-id="${escapeHtml(card.id)}" data-element="${escapeHtml(card.id)}">
        <span class="slot-name">${elementIcon(card.id)}${escapeHtml(card.name)}</span>
        <span class="slot-text">${escapeHtml(card.description ?? "")}</span>
      </button>`,
  ).join("");

  const top = `
      <div class="title-block">
        <h1>Mage Tower</h1>
        <p class="muted">Seed ${game.startSeed}</p>
        <br>
        <p>Draw numbered mana cards to build power, each draw increases the multiplier by 0.5.</p>
        <br>
        <p>Beware of Unstable cards, backfire happens when the limit is reached (default max of 2). Release whenever you choose, then arrange your loadout cards to maximize each cast.</p>
        <br>
        <p>Your element stays fixed for the entire run.</p>
      </div>`;

  return screenShell({
    top,
    body: `<div class="choices">${cards}</div>`,
    scrollKey: "pick",
  });
}
