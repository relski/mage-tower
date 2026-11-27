import type { Game } from "../../state/game";
import { escapeHtml } from "../html";
import { typeBadge } from "./card-type";

type LoadoutOptions = {
  locked?: boolean, // a failed cast is on screen: the slots cannot be used
};

// A slot: a button to pick it for a swap (the first tap) or to place a card you are holding.
function slotRow(game: Game, index: number, canClick: boolean): string {
  const card = game.loadout[index];
  const selected = game.selectedSlot === index;
  const name = card ? escapeHtml(card.name) : "(empty)";
  const description = card?.description ? escapeHtml(card.description) : "";

  return `
        <button class="slot${selected ? " selected" : ""}" data-action="slot" data-slot="${index}"
          aria-pressed="${selected}" ${canClick ? "" : "disabled"}>
          <span class="slot-name">[${index + 1}] ${name}${card ? typeBadge(card.type) : ""}</span>
          <span class="slot-text">${description}</span>
        </button>`;
}

// the slots that are not unlocked yet, as one row
function lockedRow(game: Game): string {
  const first = game.unlockedSlots + 1; // slot numbers shown to the player start at 1
  const last = game.loadout.length;

  if (first > last) {
    return "";
  }

  const label = first === last ? `[${first}]` : `[${first}]–[${last}]`;

  return `
        <div class="slot locked">
          <span class="slot-name">${label} (locked)</span>
          <span class="slot-text">Unlock slots in the shop</span>
        </div>`;
}

// The loadout in effect order, top to bottom: the unlocked slots, then the locked slots as one
// row. The element is not shown here (the player panel has it). Tapping two slots swaps them
// (only while the channel is empty), and tapping a slot places a card you are holding.
export function loadoutPanel(game: Game, { locked = false }: LoadoutOptions = {}): string {
  const pending = game.pendingCard;
  const canClick =
    !locked &&
    (pending !== null ||
      (game.phase === "stage" && game.stage !== null && game.stage.channel.length === 0) ||
      game.phase === "reward" ||
      game.phase === "shop");

  const rows: string[] = [];

  for (let index = 0; index < game.unlockedSlots; index++) {
    rows.push(slotRow(game, index, canClick));
  }

  rows.push(lockedRow(game));

  const hint = locked
    ? "The failed cast is clearing."
    : pending
      ? "Tap a slot to place it. It replaces the card there."
      : canClick
        ? "Cards trigger from top to bottom. Tap two slots to swap them."
        : "Release the channel to reorder.";

  const cancel = pending ? `<button class="small" data-action="cancel">Cancel</button>` : "";

  // the card being placed, so the player sees what they hold (and what it costs)
  const holding = pending
    ? `
      <div class="pending-card">
        <span class="slot-name">${escapeHtml(pending.card.name)}${typeBadge(pending.card.type)}${pending.cost > 0 ? ` · ${pending.cost} gold` : ""}</span>
        <span class="slot-text">${escapeHtml(pending.card.description ?? "")}</span>
      </div>`
    : "";

  return `
    <section class="panel">
      <h2>Loadout</h2>
      <p class="muted">${hint}</p>
      ${holding}
      <div class="slots">${rows.join("")}</div>
      ${cancel}
    </section>`;
}
