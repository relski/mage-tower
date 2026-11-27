import { canDraw, canRelease } from "../../core/round";
import type { StageState } from "../../core/types";
import { rulesFor } from "../../state/game";
import type { Game } from "../../state/game";

// Draw and Release (or New game once the run is lost), at equal width at the bottom of the screen.
// Draw is the filled button and Release the outlined one; a disabled button turns grey with a
// dashed border, so it reads as off and not only faded. Both are off while the stage is locked:
// a failed cast or a cast animation is on screen. The space under the bar for a phone's home
// indicator comes from the page padding.
export function actionBar(game: Game, stage: StageState, locked: boolean): string {
  const rules = rulesFor(game);

  const buttons =
    game.phase === "lost"
      ? `<button class="action-primary" data-action="restart">New game</button>`
      : `
      <button class="action-primary" data-action="draw" ${!locked && canDraw(stage, rules) ? "" : "disabled"}>Draw</button>
      <button class="action-secondary" data-action="release" ${!locked && canRelease(stage) ? "" : "disabled"}>Release</button>`;

  return `<div class="actions">${buttons}</div>`;
}
