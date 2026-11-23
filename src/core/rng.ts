export function nextRandom(seed: number): { value: number; seed: number } {
  const nextSeed = ((seed >>> 0) + 0x6D2B79F5) >>> 0;
  let t = nextSeed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

  return {
    value: ((t ^ (t >>> 14)) >>> 0) / 4294967296,
    seed: nextSeed,
  };
}

export function shuffle<T>(
  cards: readonly T[],
  seed: number,
): { cards: T[]; seed: number } {
  const shuffled = [...cards];
  let currentSeed = seed;

  for (let i = shuffled.length - 1; i > 0; i--) {
    const result = nextRandom(currentSeed);
    currentSeed = result.seed;
    const j = Math.floor(result.value * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return { cards: shuffled, seed: currentSeed };
}

// picks one entry from a list with the seeded RNG and returns the next seed
export function pickRandom<T>(list: readonly T[], seed: number): { value: T; seed: number } {
  if (list.length === 0) {
    throw new Error("Cannot pick from an empty list");
  }

  const roll = nextRandom(seed);
  const value = list[Math.floor(roll.value * list.length)] as T;

  return { value, seed: roll.seed };
}

export function randomInteger(
  minValue: number,
  maxValue: number,
  seed: number,
): { value: number; seed: number } {
  const rangeSize = maxValue - minValue + 1;

  if (
    !Number.isSafeInteger(minValue) ||
    !Number.isSafeInteger(maxValue) ||
    !Number.isSafeInteger(rangeSize) ||
    rangeSize < 1
  ) {
    throw new Error("Expected an inclusive range of safe integers with minValue <= maxValue");
  }

  const roll = nextRandom(seed);

  return {
    value: minValue + Math.floor(roll.value * rangeSize),
    seed: roll.seed,
  };
}