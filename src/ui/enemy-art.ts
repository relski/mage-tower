import goblinScout from "../assets/art/goblin-scout.png";
import stoneGolem from "../assets/art/stone-golem.png";
import towerWarden from "../assets/art/tower-warden.png";

// Unknown stage names get a generic face in a 160 x 120 box (4:3).
const FACE = `<circle cx="80" cy="60" r="30"/><path d="M68 56h.01M92 56h.01M68 74q12 8 24 0"/>`;

const DRAWINGS: Record<string, string> = {
  "Goblin Scout": `<img src="${goblinScout}" alt="" />`,
  "Stone Golem": `<img src="${stoneGolem}" alt="" />`,
  "Tower Warden": `<img src="${towerWarden}" alt="" />`,
};

export function enemyArt(name: string): string {
  return (
    DRAWINGS[name] ??
    `<svg viewBox="0 0 160 120" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${FACE}</svg>`
  );
}
