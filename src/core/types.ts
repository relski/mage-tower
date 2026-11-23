export type CardType = "element" | "modifier" | "item";
export type StackName = "burn";

export type Trigger =
  | { kind: "always" }
  | { kind: "firstCast" }
  | { kind: "everyNthCast", n: number }
  | { kind: "chance", p: number }
  | { kind: "channelHasUnstable" };

export type Action =
  | { kind: "addDamage", value: number }
  | { kind: "mulTotal", value: number }
  | { kind: "addStack", stack: StackName }
  | { kind: "addDamagePerStack", stack: StackName, value: number }
  | { kind: "addUnstableTolerance", value: number };

export type Effect = { trigger: Trigger, action: Action };

export type Card = {
  id: string,
  name: string,
  type: CardType,
  description?: string,  // one line of text for the UI
  effects: Effect[],
};

export type Loadout = (Card | null)[]; // length 5

export type ChannelCard =
  | { kind: "number", value: number }
  | { kind: "unstable" };

export type StageStatus = "ready" | "casting" | "cleared" | "failed";

// boss stage rules
export type StageRule =
  | { kind: "unstableLimitDelta", value: number }   // negative = backfire sooner
  | { kind: "multiplierCap", max: number }          // channel multiplier cannot go above this
  | { kind: "halfValueAbove", threshold: number };  // number cards above this count as half value

export type IntegerRange = { minValue: number, maxValue: number };

// the rules that apply to the channel during a stage: defaults, plus the loadout, plus the stage rule
export type ChannelRules = {
  unstableLimit: number,
  multiplierCap: number | null,    // null = no cap
  halfValueAbove: number | null,   // null = no halving
};

export type StageState = {
  name: string,
  rule: StageRule | null,
  targetHp: number,
  castsRemaining: number,
  castNumber: number,  // 1-based number of the cast being resolved; starts at 1
  totalDamage: number,
  drawPile: ChannelCard[],
  discardPile: ChannelCard[],
  channel: ChannelCard[],   // cards drawn in the current cast
  stacks: Partial<Record<StackName, number>>,
  status: StageStatus,
  seed: number,  // RNG state: pass it to nextRandom/shuffle and keep the seed they return
};

export type StageConfig = {
  name: string,
  hp: IntegerRange,
  hpGrowthPerRound: IntegerRange,
  casts: number,
  rule: StageRule | null,
};

export type StageSetup = { name: string, hp: number, casts: number, rule: StageRule | null };

export type TraceStep = { source: string, description: string, total: number };
export type CastResult = {
  score: number,
  backfired: boolean,
  trace: TraceStep[],
  nextState: StageState,
};