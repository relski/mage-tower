import type { Game } from "./game";
import { deserializeGame, isSaveable, serializeGame } from "./save";

// reads and writes the saved run in localStorage. Everything here can fail quietly:
// localStorage may be missing, blocked, full, or hold damaged text, and the game must still run.

export const SAVE_KEY = "mage-tower:save";

// the part of localStorage that saving needs, so tests can pass a fake
export type SaveStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function browserStorage(): SaveStorage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

// saves a run in progress; for any other game (choosing an element, a lost run) it deletes the save
export function persistGame(
  game: Game,
  storage: SaveStorage | null = browserStorage(),
  now: number = Date.now(),
): void {
  if (storage === null) {
    return;
  }

  try {
    if (isSaveable(game)) {
      storage.setItem(SAVE_KEY, JSON.stringify(serializeGame(game, now)));
    } else {
      storage.removeItem(SAVE_KEY);
    }
  } catch {
    // storage is full or blocked: the run simply is not saved this time
  }
}

// the saved run, or null when there is none or it cannot be read
export function loadSavedGame(storage: SaveStorage | null = browserStorage()): Game | null {
  if (storage === null) {
    return null;
  }

  try {
    const text = storage.getItem(SAVE_KEY);

    return text === null ? null : deserializeGame(JSON.parse(text));
  } catch {
    return null;
  }
}
