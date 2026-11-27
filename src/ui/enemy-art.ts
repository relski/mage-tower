// Placeholder enemy pictures: simple line drawings until there is real art.
// They are looked up by the enemy's name (the name of its stage config in data/stages),
// and any other name gets a generic face. Real art can replace these strings with <img> markup
// without touching the panel that shows them. If enemies multiply, give StageConfig an id and
// key this by it instead.

// all drawn in a 160 x 120 box (4:3) with the current text color
const FACE = `<circle cx="80" cy="60" r="30"/><path d="M68 56h.01M92 56h.01M68 74q12 8 24 0"/>`;

const DRAWINGS: Record<string, string> = {
  "Goblin Scout": `<circle cx="80" cy="64" r="28"/><path d="M52 58 28 44l8 26"/><path d="M108 58l24-14-8 26"/><path d="M70 62h.01M90 62h.01"/><path d="M68 78q12 8 24 0"/>`,
  "Stone Ogre": `<rect x="44" y="30" width="72" height="68" rx="14"/><path d="M58 54h16M86 54h16"/><path d="M68 66h.01M92 66h.01"/><path d="M62 86h36M68 86v8M92 86v8"/>`,
  "Tower Warden": `<path d="M52 104V40h16v8h8v-8h8v8h8v-8h16v64z"/><path d="M72 104V84a8 8 0 0 1 16 0v20"/><path d="M80 58v10"/>`,
};

export function enemyArt(name: string): string {
  return `<svg viewBox="0 0 160 120" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${DRAWINGS[name] ?? FACE}</svg>`;
}
