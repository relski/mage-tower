// Small inline SVG icons (no icon library). They draw with the current text color,
// so CSS can tint them, and they are hidden from screen readers: the text next to
// an icon, or the aria-label of its button, says what it means.

export type IconName =
  | "fire"
  | "ice"
  | "lightning"
  | "earth"
  | "coin"
  | "menu"
  | "log"
  | "enemy"
  | "loadout"
  | "unstable"
  | "buy"
  | "sell";

const PATHS: Record<IconName, string> = {
  fire: `<path d="M12 3c.5 3 4.5 5 4.5 9.5a4.5 4.5 0 0 1-9 0c0-1.8.8-3 1.8-4 .2 1.2.8 2 1.7 2.4C10.7 8.6 10.8 5.6 12 3z"/>`,
  ice: `<path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9"/>`,
  lightning: `<path d="M13 3 6 13.5h5.5L10.5 21 18 10.5h-5.5L13 3z"/>`,
  earth: `<path d="M3 19 9 8l4 6 2-3 6 8H3z"/>`,
  coin: `<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/>`,
  menu: `<path d="M4 7h16M4 12h16M4 17h16"/>`,
  // the three tabs of the stage screen: a page of text, a skull, and a wand with a spark
  log: `<path d="M7 4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><path d="M9 9h6M9 13h6M9 17h3"/>`,
  enemy: `<path d="M12 3a7 7 0 0 0-7 7c0 2.4 1.2 4.1 3 5.2V19h8v-3.8c1.8-1.1 3-2.8 3-5.2a7 7 0 0 0-7-7z"/><circle cx="9.5" cy="11" r="1"/><circle cx="14.5" cy="11" r="1"/><path d="M10.5 19v2M13.5 19v2"/>`,
  loadout: `<path d="M4 20 14 10"/><path d="M17 3v4M15 5h4M20 11v3M18.5 12.5h3"/>`,
  // a warning triangle, for Unstable cards
  unstable: `<path d="M12 3 2.5 20h19L12 3z"/><path d="M12 10v4M12 17h.01"/>`,
  // the shop's tabs: a bag to buy, a price tag to sell
  buy: `<path d="M6 8h12l-1 12H7L6 8z"/><path d="M9 8V7a3 3 0 0 1 6 0v1"/>`,
  sell: `<path d="M3 12V4h8l10 10-8 8L3 12z"/><path d="M7.5 8h.01"/>`,
};

// the element card ids in data/cards/elements.ts that have an icon of the same name
const ELEMENT_ICONS: readonly string[] = ["fire", "ice", "lightning", "earth"];

export function icon(name: IconName): string {
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${PATHS[name]}</svg>`;
}

// the icon of an element card, or nothing for an id without one
export function elementIcon(elementId: string): string {
  return ELEMENT_ICONS.includes(elementId) ? icon(elementId as IconName) : "";
}
