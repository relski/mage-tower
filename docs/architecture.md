# Architecture

Code conventions and structure for the Mage Tower prototype. For the game design itself, see [overview.md](./overview.md).

## Folder structure

Everything below exists in the repository, except the empty `ui/` subfolders, which are reserved for the real UI (Phase 4).

```
mage-tower/
├─ AGENTS.md
├─ TODO.md
├─ docs/                      overview.md, architecture.md
├─ index.html
├─ package.json
├─ tsconfig.json
└─ src/
   ├─ main.ts                 entry point, mounts the app
   ├─ style.css               styles for the text prototype
   ├─ core/                   pure TypeScript, no DOM, fully testable
   │  ├─ types.ts             Card, Effect, Loadout, ChannelCard, ChannelRules, StageRule, StageState, CastResult
   │  ├─ channel.ts           channel helpers (power, multiplier, backfire) and drawCard
   │  ├─ rules.ts             getChannelRules (defaults + loadout + stage rule) and describeRule
   │  ├─ scoring.ts           resolveCast: channel result + loadout → score + trace
   │  ├─ round.ts             stage state machine: createStage, canDraw, drawIntoChannel, releaseCast
   │  ├─ loadout.ts           starting loadout, slot swapping, SLOT_COUNT
   │  ├─ run.ts               rewards, shop offers, deck changes, placing cards, gold for a stage
   │  ├─ rng.ts               seeded random generator: nextRandom, shuffle, pickRandom
   │  ├─ test-helpers.ts      makeState, num, unstable (tests only)
   │  └─ *.test.ts            channel, rules, scoring, round, loadout, run, rng, rng-pick
   ├─ data/                   content as plain data, no logic
   │  ├─ cards/
   │  │  ├─ elements.ts       fire, ice, lightning, earth, and the ELEMENTS list
   │  │  ├─ modifiers.ts      the 16 modifiers and the MODIFIERS list
   │  │  ├─ items.ts          the 10 items and the ITEMS list
   │  │  └─ cards.test.ts, more-cards.test.ts   card behavior tests
   │  ├─ stages/
   │  │  ├─ enemies.ts        goblin scout, stone ogre
   │  │  ├─ bosses.ts         tower warden and its rule
   │  │  └─ rounds.ts         ROUND_ONE: the three stages in order
   │  ├─ channel-deck.ts      createStartingDeck (14 numbers, 6 Unstable)
   │  └─ tuning.ts            multiplier steps, Unstable limit, default channel rules, gold, prices, slots
   ├─ state/
   │  ├─ game.ts              the Game state, pure apply* functions, and the store that wraps them
   │  └─ game.test.ts
   └─ ui/
      ├─ app.ts               the text UI: renders the game and handles clicks
      ├─ screens/             (empty, for Phase 4)
      ├─ components/          (empty, for Phase 4)
      ├─ animation/           (empty, for Phase 4)
      └─ styles/              (empty, for Phase 4)
```

The tree should be updated when the structure changes.

## Ground rules

1. **Dependencies point one way:** `ui → state → core`. Nothing in `core` imports from `ui` or `state`, and nothing in `core` touches the DOM. `core` reads its tuning numbers from `data/tuning.ts`, and files in `data/` import only types from `core`.
2. **Cards are data, not code.** An effect is a small declarative object that the engine interprets. Adding a card means adding an entry in `data/`, not changing the engine.
3. **Two kinds of cards, two types.** Loadout cards (`Card`: element, modifier, item) amplify casts. Channel cards (`ChannelCard`: number, unstable) are drawn each cast. Never mix them in one type.
4. **The scoring engine returns a trace.** `resolveCast` returns the final score and a step-by-step trace of what happened, starting with the channel step. The UI animates the trace and never computes scores itself, so what is shown cannot drift from the real result.
5. **Scoring uses a running total.** The channel gives a starting total (power × multiplier). Loadout cards then act on that running total left to right, and a multiply step applies to the total at that moment. There is a single running damage total, with no separate chips and mult. Scores are whole numbers (round down after each multiplication). The engine must never reorder slots.
6. **Tuning numbers live in `data/`.** HP, cast limits, multiplier steps, deck contents, gold and prices can be rebalanced without touching engine code.
7. **All randomness goes through `rng.ts` with a seed.** That covers shuffling the channel deck, random modifier and item picks, rewards, shop offers, and chance triggers. The RNG state is stored in `StageState.seed` and `Game.seed`, so everything is reproducible in tests. The only place a seed comes from the clock is the store, when it starts a new game.
8. **Core functions do not mutate their inputs.** They take the current state and return the next state, which keeps tests simple and makes undo or replays possible later.
9. **Channel rules come from one place.** `getChannelRules(loadout, stageRule)` builds the effective Unstable limit, multiplier cap and half-value threshold. `channel.ts`, `round.ts` and `scoring.ts` take those rules as an argument and default to the plain rules.
10. **Stage bookkeeping has one owner.** Only `releaseCast` in `round.ts` changes `castNumber` and `castsRemaining`, moves the channel to the discard pile, and sets the stage status.

## Core types

These are the types in `core/types.ts` (`type` everywhere, commas in object types).

```ts
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

export type StageRule =
  | { kind: "unstableLimitDelta", value: number }   // negative = backfire sooner
  | { kind: "multiplierCap", max: number }
  | { kind: "halfValueAbove", threshold: number };

export type ChannelRules = {
  unstableLimit: number,
  multiplierCap: number | null,
  halfValueAbove: number | null,
};

export type StageState = {
  name: string,
  rule: StageRule | null,
  targetHp: number,
  castsRemaining: number,
  castNumber: number,       // 1-based number of the cast being resolved; starts at 1
  totalDamage: number,
  drawPile: ChannelCard[],
  discardPile: ChannelCard[],
  channel: ChannelCard[],   // cards drawn in the current cast
  stacks: Partial<Record<StackName, number>>,
  status: StageStatus,
  seed: number,             // RNG state
};

export type StageConfig = { name: string, hp: number, casts: number, rule: StageRule | null };

export type TraceStep = { source: string, description: string, total: number };
export type CastResult = {
  score: number,
  backfired: boolean,
  trace: TraceStep[],
  nextState: StageState,
};
```

Notes:

- `Trigger` and `Action` are unions because each member has different fields, and the `kind` field lets TypeScript narrow the type in a `switch`. The `switch` statements over them are exhaustive, so adding a new kind makes the compiler point to every place that needs a case.
- `addUnstableTolerance` is a channel rule. `getChannelRules` reads it from the loadout (only from effects with the `always` trigger), and scoring ignores it.
- `core/run.ts` adds `RewardOption` and `ShopOffer`, and `state/game.ts` adds `Phase`, `PendingCard` and `Game`.

Example: Fire is `+20 damage`, then `+6 damage per burn stack`, then `add burn stack`, all expressed as data.

## Casting flow

1. `getChannelRules(loadout, stage.rule)` gives the rules for this stage.
2. `canDraw`, `drawIntoChannel` and `drawCard` use the rules: `drawCard` moves the top card of the draw pile into the channel and reports whether it caused a backfire. It never draws past 5 cards, after a backfire, or from an empty pile.
3. `shouldAutoRelease` says when the channel must release by itself (full, or backfired).
4. `releaseCast(state, loadout)` calls `resolveCast`, which computes the starting total (`channelPower` × `channelMultiplier`), then runs the loadout left to right and returns a `CastResult`. A backfire returns a score of 0 with a trace that says why. `releaseCast` then adds the damage, moves the channel to the discard pile, updates `castNumber` and `castsRemaining`, and sets the status to `cleared` or `failed` when it applies.
5. Chance triggers roll `nextRandom(state.seed)` inside `resolveCast`, and the next seed is returned in `nextState`.

## Game state and phases

`state/game.ts` holds the `Game` and the rules of the run flow. The `apply*` functions are pure (a game in, a game out), and the store functions (`draw`, `release`, `pick`, and so on) call them and notify the UI.

```
pick ──applyPick──▶ stage ──clear (not last)──▶ reward ──pick or skip──▶ shop ──next stage──▶ stage ...
                       │                                                                       
                       ├──clear (last stage)──▶ won
                       └──out of casts────────▶ lost
```

- **pick:** choose the element. `applyPick` builds the starting loadout and the first stage.
- **stage:** `applyDraw` and `applyRelease` play the casts (with auto-release). Clearing a stage pays gold and creates the reward options.
- **reward:** `applyChooseReward` or `applySkipReward`. A card reward becomes a `pendingCard` that waits for a slot.
- **shop:** `applyBuy`, then `applyNextStage` to start the next stage with the run's deck.
- **Slots:** `applySelectSlot` places a pending card (into an unlocked slot) or swaps two slots. Swapping is only allowed on the stage, reward and shop screens, and on the stage screen only while the channel is empty.
- **won / lost:** `restart` starts a new game.

## UI

`ui/app.ts` renders the whole game as text and buttons from the current `Game`, and handles clicks with one delegated listener. It calls the store functions and never changes state itself. The `ui/screens`, `components`, `animation` and `styles` folders are reserved for the real UI.

## Testing

- Vitest, with `npm run test:run` for a single run.
- Tests sit next to the code they cover (`*.test.ts`). `core/test-helpers.ts` has `makeState` (a stage state with sensible defaults), `num` and `unstable` for building channels.
- Card tests use fixed seeds found by searching for one whose first roll hits or misses a chance, so lucky effects are tested deterministically.
- The reference casts below are the anchor tests for the scoring engine.

## Tooling

- Vite for dev server and build
- TypeScript in strict mode
- Vitest for tests
- Plain CSS for the text prototype, with vanilla TypeScript for the UI

## First test cases

The reference casts from the overview. With the loadout Cracked Staff, Fire, Pierce:

- Cast 1 (draw 5, Unstable, 3) scores **84**.
- Cast 2 (one burn stack, draw 4, 4) scores **57**.
- With the loadout reordered to Fire, Pierce, Staff, cast 1 scores **74**, which proves slot order matters.
- Drawing a second Unstable card in one cast scores **0**.
