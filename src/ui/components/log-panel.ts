import type { Game } from "../../state/game";
import { escapeHtml } from "../html";

// how many of the newest lines are shown; the game keeps the rest of the log
export const LOG_LINES_SHOWN = 30;

// The combat log: the newest lines, one per list item, oldest at the top and newest at the bottom.
// The app scrolls it to the newest line after a render, unless the player had scrolled up.
// It is a focusable region so the keyboard can scroll it, and it does not announce itself:
// the whole markup is replaced on every render, which would make a live region read it all out.
export function logPanel(game: Game): string {
  const lines = game.log
    .slice(-LOG_LINES_SHOWN)
    .map((line) => `<li>${escapeHtml(line)}</li>`)
    .join("");

  return `<ul class="log" role="log" aria-live="off" aria-label="Combat log" tabindex="0">${lines}</ul>`;
}
