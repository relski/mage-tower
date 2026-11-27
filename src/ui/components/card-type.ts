import type { CardType } from "../../core/types";

// A small label that tells the two kinds of loadout card apart: modifier or item.
// The element is not a loadout card (it has its own colored row), so it gets no badge.
export function typeBadge(type: CardType): string {
  if (type === "element") {
    return "";
  }

  const label = type === "modifier" ? "Modifier" : "Item";

  return `<span class="type-badge" data-type="${type}">${label}</span>`;
}
