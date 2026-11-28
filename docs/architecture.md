# Architecture

Code conventions and structure for the Mage Tower prototype. For the game design itself, see [overview.md](./overview.md).

## Folder structure

Everything below exists in the repository. `src/assets/` exists but is empty.

```
mage-tower/
├─ AGENTS.md
├─ TODO.md
├─ docs/                      overview.md, architecture.md
├─ index.html
├─ package.json
├─ tsconfig.json
└─ src/
   ├─ main.ts                 entry point, resumes a saved run and mounts the app
   ├─ style.css               styles for the text prototype
   ├─ assets/                 (empty)
   ├─ core/                   pure TypeScript, no DOM, fully testable
   │  ├─ types.ts             Card, Effect, Loadout, ChannelCard, ChannelRules, StageRule, StageConfig, StageSetup, StageState, CastResult
   │  ├─ channel.ts           channel helpers (power, multiplier, backfire) and drawCard
   │  ├─ rules.ts             getChannelRules (defaults + element + loadout + stage rule) and describeRule
   │  ├─ scoring.ts           resolveCast: channel result + fixed element + loadout → score + trace
   │  ├─ round.ts             stage state machine: createStage, canDraw, drawIntoChannel, releaseCast
   │  ├─ loadout.ts           starting loadout, slot swapping, cardsInEffectOrder (the loadout with the element between slots 1 and 2), SLOT_COUNT
   │  ├─ run.ts               rewards, shop offers, deck changes, placing cards, gold for a stage
   │  ├─ rng.ts               seeded random generator: nextRandom, randomInteger, shuffle, pickRandom
   │  ├─ test-helpers.ts      makeState, num, unstable (tests only)
   │  └─ *.test.ts            channel, rules, scoring, round, loadout, run, rng, rng-pick
   ├─ data/                   content as plain data, no logic
   │  ├─ cards/
   │  │  ├─ elements.ts       fire, ice, lightning, earth, and the ELEMENTS list
   │  │  ├─ modifiers.ts      the 16 modifiers and the MODIFIERS list
   │  │  ├─ items.ts          the 10 items and the ITEMS list
   │  │  └─ cards.test.ts, more-cards.test.ts   card behavior tests
   │  ├─ stages/
   │  │  ├─ enemies.ts        goblin scout, stone golem
   │  │  ├─ bosses.ts         tower warden and the BOSS_RULES pool
   │  │  └─ rounds.ts         ROUND_STAGES: the three stages repeated each round
   │  ├─ channel-deck.ts      createStartingDeck (14 numbers, 6 Unstable)
   │  └─ tuning.ts            multiplier steps, Unstable limit, default channel rules, gold, prices, slots
   ├─ state/
   │  ├─ game.ts              the Game state, pure apply* functions, and the store that wraps them
   │  ├─ game.test.ts
   │  ├─ save.ts              the saved format: serializeGame, deserializeGame (checks everything it loads), isSaveable
   │  ├─ save-storage.ts      persistGame and loadSavedGame, the only code that touches localStorage
   │  └─ save.test.ts
   └─ ui/
      ├─ app.ts               mounts the app, keeps the UI-only state and the cast playback, turns clicks into store calls
      ├─ html.ts              escapeHtml (safe in text and in quoted attributes), used by every view
      ├─ icons.ts             inline SVG icons (the elements, coin, menu, the log, enemy and loadout tabs, the shop's buy and sell tabs, the Unstable warning)
      ├─ enemy-art.ts         imported enemy illustrations, looked up by stage name, with a generic face fallback
      ├─ ui-state.ts          UiState: the UI-only state (menu, tabs, backfire preview, cast animation, reward confirmation) the views are given
      ├─ screens/
      │  ├─ screen-shell.ts   the frame of the pick, reward and shop screens: fixed top, scrolling body, pinned buttons
      │  ├─ pick-screen.ts    the four elements as colored cards
      │  ├─ reward-screen.ts  the reward options and the loadout, with Skip pinned
      │  ├─ shop-screen.ts    Buy, Sell and Loadout tabs, with Next stage (or Begin Round) pinned
      │  └─ stage-screen.ts   the stage screen in four regions (player panel, tab section, channel, buttons), built from the panels below
      ├─ components/          the panels of the screens, one per file
      │  ├─ player-panel.ts   one row: element chip, gold, and the menu (seed, sound switch, Abandon run)
      │  ├─ tab-section.ts    three icon tabs (combat log, enemy, loadout) above the selected tab's content
      │  ├─ enemy-panel.ts    the enemy tab: picture, name, round and stage, HP meter, boss rule
      │  ├─ lost-panel.ts     where the run ended (shown on the stage screen after a loss)
      │  ├─ card-type.ts      typeBadge: the Modifier or Item label on a card
      │  ├─ loadout-panel.ts  the loadout in effect order: the slots, then one row for locked slots (the element is in the player panel, not here)
      │  ├─ channel-panel.ts  pile, discard and casts on top, the five fixed card slots, and the power line
      │  ├─ action-bar.ts     Draw (filled) and Release (outlined) at equal width, or New game; disabled buttons are grey and dashed
      │  └─ log-panel.ts      the newest 30 lines of the game log (the game keeps the rest)
      ├─ animation/
      │  ├─ cast-timeline.ts  castTimeline: a cast's trace as frames with durations (pure), plus drainDamage
      │  ├─ cast-timeline.test.ts
      │  └─ cast-playback.ts  playCast: runs the frames with timers and requestAnimationFrame, can be skipped
      ├─ audio/
      │  └─ sound.ts          sound effects made with the Web Audio API (no sound files yet): playSound, unlockAudio, the mute switch
      └─ styles/
         ├─ tokens.css        design tokens: colors (light and dark; element, card kind, gold and warning colors), type scale, spacing, radius, shadow, motion, tap size, safe areas
         ├─ stage-layout.css  the fixed-height layout of the stage screen
         └─ components.css    styles for the Phase 4 components: icons, player panel and menu, tabs, enemy tab, pick screen element cards, channel panel, action bar, cast animation
```

The tree should be updated when the structure changes.

## Ground rules

1. **Dependencies point one way:** `ui → state → core`. Nothing in `core` imports from `ui` or `state`, and nothing in `core` touches the DOM. `core` reads its tuning numbers from `data/tuning.ts`, and files in `data/` import only types from `core`.
2. **Cards are data, not code.** An effect is a small declarative object that the engine interprets. Adding a card means adding an entry in `data/`, not changing the engine.
3. **Two kinds of cards, two types.** `Card` data has element, modifier and item types, but only modifiers and items occupy loadout slots. The chosen element is stored separately and stays fixed for the run. Channel cards (`ChannelCard`: number, unstable) are drawn each cast. Never mix them in one type.
4. **The scoring engine returns a trace.** `resolveCast` returns the final score and a step-by-step trace of what happened, starting with the channel step. The UI animates the trace (through `Game.lastCast`, see Cast animation) and never computes scores itself, so what is shown cannot drift from the real result.
5. **Scoring uses a running total.** The channel gives a starting total (power × multiplier). Loadout cards act on that running total left to right, with the fixed element inserted between loadout slots 1 and 2. A multiply step applies to the total at that moment. There is a single running damage total, with no separate chips and mult. Scores are whole numbers (round down after each multiplication). The engine must never reorder slots.
6. **Tuning numbers live in `data/`.** HP, cast limits, multiplier steps, deck contents, gold and prices can be rebalanced without touching engine code.
7. **All randomness goes through `rng.ts` with a seed.** That covers shuffling the channel deck, random starting modifier and item picks, rewards, shop offers, and chance triggers. The RNG state is stored in `StageState.seed` and `Game.seed`, so everything is reproducible in tests. The only place a seed comes from the clock is the store, when it starts a new game.
8. **Core functions do not mutate their inputs.** They take the current state and return the next state, which keeps tests simple and makes undo or replays possible later.
9. **Channel rules come from one place.** `getChannelRules(loadout, stageRule, element)` builds the effective Unstable limit, multiplier cap and half-value threshold from the fixed element, loadout and stage rule. `channel.ts`, `round.ts` and `scoring.ts` take those rules as an argument and default to the plain rules.
10. **Stage bookkeeping has one owner.** Only `releaseCast` in `round.ts` changes `castNumber` and `castsRemaining`, moves the channel to the discard pile, reshuffles the discard pile into an empty draw pile (while the stage goes on), and sets the stage status.

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

export type Loadout = (Card | null)[]; // length 5; only modifiers and items may be placed

export type ChannelCard =
  | { kind: "number", value: number }
  | { kind: "unstable" };

export type StageStatus = "ready" | "casting" | "cleared" | "failed";

export type StageRule =
  | { kind: "unstableLimitDelta", value: number }   // negative = backfire sooner
  | { kind: "multiplierCap", max: number }
  | { kind: "halfValueAbove", threshold: number };

export type IntegerRange = { minValue: number, maxValue: number };

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
```

Notes:

- `Trigger` and `Action` are unions because each member has different fields, and the `kind` field lets TypeScript narrow the type in a `switch`. The `switch` statements over them are exhaustive, so adding a new kind makes the compiler point to every place that needs a case.
- `addUnstableTolerance` is a channel rule. `getChannelRules` reads it from the fixed element and loadout (only from effects with the `always` trigger), and scoring ignores it.
- `core/run.ts` adds `RewardOption` and `ShopOffer`, and `state/game.ts` adds `Phase`, `PendingCard`, `CastReport` and `Game`.

Example: Fire is `+20 damage`, then `+3 damage per burn stack`, then `add burn stack`, all expressed as data.

## Casting flow

1. `getChannelRules(loadout, stage.rule, element)` gives the rules for this stage.
2. `canDraw`, `drawIntoChannel` and `drawCard` use the rules: `drawCard` moves the top card of the draw pile into the channel and reports whether it caused a backfire. It never draws past 5 cards, after a backfire, or from an empty pile.
3. `shouldAutoRelease` says when the channel must release by itself (full, or backfired).
4. `releaseCast(state, loadout, element)` calls `resolveCast`, which computes the starting total (`channelPower` × `channelMultiplier`), then runs slot 1, the fixed element, and slots 2 through 5 in order, returning a `CastResult`. A backfire returns a score of 0 with a trace that says why. `releaseCast` then adds the damage, moves the channel to the discard pile, updates `castNumber` and `castsRemaining`, and sets the status to `cleared` or `failed` when it applies. If the stage goes on and the draw pile is now empty, it shuffles the discard pile into the draw pile with the seed, so the next cast can always draw.
5. Chance triggers roll `nextRandom(state.seed)` inside `resolveCast`, and the next seed is returned in `nextState`.

## Game state and phases

`state/game.ts` holds the `Game`, including the current round number, and the rules of the run flow. The `apply*` functions are pure (a game in, a game out), and the store functions (`draw`, `release`, `pick`, and so on) call them and notify the UI.

```
pick ──applyPick──▶ stage ──clear (not boss)──▶ reward ──pick or skip──▶ shop ──next stage──▶ stage ...
                       │
                       ├──clear (boss)──▶ shop ──begin round──▶ next round, stage 1
                       └──out of casts──▶ lost
```

- **pick:** choose the immutable element. `applyPick` stores it outside the loadout, picks a random modifier and item for slots 2 and 1 respectively, and starts the first stage.
- **stage:** `applyDraw` and `applyRelease` play the casts (with auto-release). A draw that backfires also records the channel in `Game.lastBackfire`, which the UI shows briefly (it never recomputes the rules); a manual release clears it. Every release (manual, or the automatic one at 5 cards or a backfire) records a `CastReport` in `Game.lastCast` for the cast animation. Each stage start rolls HP from its configured range and adds seeded growth for later rounds. Clearing any stage pays gold; clearing a non-boss stage also creates the reward options.
- **reward:** `applyChooseReward` or `applySkipReward`. A card reward goes into the first empty unlocked slot right away. Only when every unlocked slot is full does it become a `pendingCard` that waits for the player to pick the slot to replace.
- **shop:** `applyBuy` and `applySellCard` handle purchases and sales; then `applyNextStage` starts the next stage with the run's deck. Any modifier or item in an unlocked slot sells for 5 gold. Clearing the boss opens the shop again before the next round.
- **Slots:** `applySelectSlot` places a pending card (into an unlocked slot) or swaps two slots. Swapping is only allowed on the stage, reward and shop screens, and on the stage screen only while the channel is empty.
- **lost:** `restart` starts a new game.

## Saving

A run in progress is saved to localStorage under the key `mage-tower:save` after every action.

- **What is saved:** the whole `Game` as JSON (`SavedGame` in `state/save.ts`), with a `version` and a `savedAt` time. Cards are saved by id and looked up in `data/` when loading, so a saved run uses the current card data. The stage state, the draw and discard piles and the seeds are saved as they are, so a reload gives exactly the same next draw and cannot be used to reroll. `lastBackfire` (a display flash), `lastCast` (the cast replay) and anything else the UI keeps is not saved, and the log keeps only its newest 200 lines.
- **When:** `update` in the store calls `persistGame` after every change. Only the stage, reward and shop phases are saved. Choosing an element, losing and restarting delete the save.
- **Loading:** `main.ts` calls `resumeSavedGame()` once before the UI mounts. `deserializeGame` checks every field (card ids and types, locked slots, numbers, the stage status for the screen, held cards) and returns `null` for anything that does not fit, so an old, edited or damaged save is ignored and the game starts fresh instead of crashing.
- **Failure:** `state/save-storage.ts` catches every storage error (missing, blocked, full), so saving never stops the game.
- **Changing the format:** raise `SAVE_VERSION` when an old save can no longer be read. Adding or renaming cards needs no bump, since a save whose cards no longer exist is rejected.
- **Starting over:** the UI's "Abandon run" button asks for confirmation and calls `restart`.
- **Tabs:** two tabs of the same game overwrite each other's save (the last write wins). This is accepted for the prototype.

## UI

`ui/app.ts` mounts the UI, keeps the UI-only state and the cast animation's playback, and handles clicks with one delegated listener. It calls the store functions and never changes state itself. Each screen is in `ui/screens/` (stage, pick, reward, shop) and is built from the panels in `ui/components/`. Each panel is a function that takes the game and returns an HTML string, and `ui/html.ts` has `escapeHtml` for all text. The `ui/animation` folder has the cast animation (see Cast animation below).

`src/style.css` holds the base styles of the text prototype. All colors, type sizes, spacing, radius, shadow, motion, the 44px tap size and the safe-area insets are custom properties in `ui/styles/tokens.css`, and `main.ts` imports tokens, then `style.css`, then `stage-layout.css`, then `components.css`. New styles use the tokens and not raw values. `index.html` sets `viewport-fit=cover`, and the page padding uses the safe-area insets so nothing sits under a notch or the home bar.

Every screen fits the screen height. `app.ts` puts a `fit-screen` class on `#app`, and `stage-layout.css` sizes `#app` to `100dvh` with no page scroll. Each screen is a grid with a fixed top, a middle that scrolls inside itself, and the buttons pinned at the bottom. On the stage screen the grid has four regions: the top (the player panel), the tab section (the selected tab's content, `.tab-body`, is the part that scrolls), the channel (the channel panel), and the buttons. The pick, reward and shop screens use `screenShell` (top, `.screen-body`, optional buttons). The part that scrolls has a `data-scroll-key`, and `app.ts` keeps its scroll position across re-renders as long as the key is the same (it changes with the tab or the screen content).

No screen has a page header. The stage, reward and shop screens have the player panel as their top row, and the pick screen has a title block with the seed. The menu button in the player panel opens a small menu with the run's seed, the sound switch and Abandon run (not on a lost run). Whether the menu is open is UI state (`menuOpen` in `mountApp`), never saved, and any other button closes it (the sound switch keeps it open, to show its new state).

The selected tab is UI state too (`activeTab` in `mountApp`), never saved. It starts on the Enemy tab (`DEFAULT_TAB` in `tab-section.ts`) and goes back to it after a draw or a release and when a stage starts. Selecting or swapping loadout slots does not reset it, because a swap takes two taps on the Loadout tab. Each tab is an icon-only button, so it has an `aria-label` and a title.

All UI-only state is one `UiState` object (`ui/ui-state.ts`) that `mountApp` builds on every render and passes to the views. Besides the menu, the tabs and the backfire preview, it holds the cast animation's view (`cast`) and `confirmReward`, the card reward waiting for a Yes or No in the reward screen's popup.

### Styling rules

- **Card buttons share one base** (`.slot`, `.choice` and `.element-row` in `style.css`): the loadout slots, the reward and shop options, and the element cards of the pick screen. `.element-row` adds its element's color, and the card kind (modifier or item) shows as a small badge (`typeBadge`).
- **Hover only where there is a pointer.** Hover styles are inside `@media (hover: hover)`, so touch screens do not keep a card highlighted after a tap.
- **Keyboard focus** shows a ring (`--focus-ring`) on every button and on the log.
- **Motion is short and optional.** Button transitions use `--ease-quick`, and `prefers-reduced-motion: reduce` turns off transitions, the press effect and the cast animation.
- **All buttons** use `touch-action: manipulation` (no double-tap zoom delay) and have no tap highlight.

### Other screens

- **Pick:** a title block (title, short explanation, seed) and the four elements as colored cards, one under the other. Their descriptions are long, so a grid would be cramped. The cards use the `.element-row` style: a card button in the element's color.
- **Reward:** the player panel on top (so gold is in view), the reward options and the loadout in the scrolling middle, and Skip pinned at the bottom. After confirming a card reward, it fills the first empty unlocked slot automatically; if none is empty, the options go away and the loadout remains so the player can choose a slot. Tapping a modifier or item reward first opens a popup showing the card, with Yes and No (Escape also answers No); only Yes takes the card. Deck changes are taken with one tap, with no popup.
- **Shop:** the player panel and three tabs (Buy, Sell, Loadout) on top, the selected tab's content in the scrolling middle, and Next stage (or Begin Round) pinned at the bottom. The selected tab is UI state (`shopTab` in `mountApp`), never saved. Buying a card moves to the Loadout tab to place it, and placing or cancelling moves back to Buy. Leaving the shop, restarting and abandoning reset it to Buy. After the boss, the Buy tab says the round is cleared.
- **Lost:** the stage screen with a "Run over" panel (where the run ended and the gold left) under the channel, and New game in place of Draw and Release.

### Cast animation

When a cast is released (by the Release button, or by the automatic release at 5 cards), `releaseStage` in `state/game.ts` stores a `CastReport` in `Game.lastCast`: the trace, the score, the stage's damage before and after, and a copy of the game as it was just before the release (`before`, whose own `lastCast` is `null`, so reports never chain). It is never saved. A draw that does not release, a pick and the next stage set it back to `null`.

`mountApp` notices a report it has not played yet when it renders (`playedCast` remembers the last one). Unless the cast backfired or the player prefers reduced motion, it starts the animation:

- **The screen stays on the stage.** While it plays, the screen is drawn from `report.before` and not from the real game, so a cast that clears the stage or ends the run does not jump to the reward, shop or lost screen first. The real game (already updated, and already saved) is shown when the animation ends.
- **Timing is a pure function.** `castTimeline` in `ui/animation/cast-timeline.ts` turns the trace into frames: one per trace step (the channel's power, then each card that changed the total), about 2 seconds for all of them with each step between 220 and 420 ms, then a drain frame of 600 ms and a 300 ms hold. `cast-playback.ts` runs the frames with timers and `requestAnimationFrame`.
- **How it draws.** Each step re-renders the Enemy tab with a `CastView` (the running total as a big number over the enemy picture, and what changed it), which restarts the CSS pop. The drain frame shakes the enemy and moves the HP meter and its label in place on every animation frame, without re-rendering.
- **Locked, and skippable.** While it plays, Draw, Release and the loadout slots are off (`isLocked` in `ui-state.ts`), and any tap anywhere skips the animation and does nothing else. The Enemy tab is the one showing, because a draw or release resets the tab to it.
- **No animation for a backfire** (the red channel panel shows for 2 seconds instead). With `prefers-reduced-motion: reduce` the animation is skipped completely, and the CSS animations are disabled too.
- The log still gets every trace step as text.

### Sound

`ui/audio/sound.ts` plays the sound effects. It uses the Web Audio API and builds every sound from a few short tones, so there are no sound files yet; a recorded file can replace a sound later by changing only the inside of `playSound`. `playSound(name, rate)` takes a `SoundName` and a pitch multiplier, and quietly does nothing when sound is muted, the browser has no audio, or audio has not been unlocked yet.

- **Unlocking.** Browsers start audio only after a tap, so the click listener in `mountApp` calls `unlockAudio()` first, even before the "any tap skips the animation" check.
- **Played at the moment of the event, never from `render`** (which runs far more often than things happen). The click handler plays the draw, Unstable and backfire sounds, buying and selling, reward and slot placing, and light taps. The cast playback handlers play each step, the hit, and then the clear or lost sound when the animation ends or is skipped. The one exception is the reduced-motion path, which has no animation, so `render` plays the hit and the result once per cast report, the same way it starts the animation.
- **Rising steps.** Each trace step of a cast sounds a little higher than the last (`1 + steps * 0.08`, at most one octave up).
- **Mute.** The player's choice is kept under `mage-tower:muted` in localStorage, separate from the run's save so abandoning a run keeps it. The menu's Sound button switches it. Like saving, it never throws when storage is missing or blocked.
- It has no tests, since it needs a browser.

### Stage screen (Phase 4)

The stage screen is one portrait screen that fits a phone without scrolling the page (layout and behavior: see "Stage screen layout" in the overview). Top to bottom:

1. **Player panel:** one row with the element (icon and name), gold (coin icon and number) and a menu button for Abandon run.
2. **Tab section:** a row of three icon tabs (combat log, enemy view, loadout) above one content area that takes the remaining height. The enemy view holds the enemy image, name, round and stage, the HP meter and the boss rule. The loadout tab holds the five slots (the element is in the player panel, not listed here).
3. **Channel panel:** pile and discard counts at the top, casts left, the five card slots (the drawn cards, with a red state for a backfire), and the power and Unstable count.
4. **Action bar:** the Draw and Release buttons.

Structure:

- `ui/screens/stage-screen.ts` assembles the four parts and passes them the `Game` and the `UiState`.
- `ui/components/` has one file per part: `player-panel`, `tab-section` (which shows `enemy-panel`, `log-panel` or `loadout-panel`), `channel-panel` and `action-bar`.
- `ui/animation/` has the cast animation (see Cast animation above).
- `ui/styles/` holds the design tokens (colors, spacing, element colors), the page layout and the component styles.

UI rules for this screen:

- **The selected tab is UI state**, kept in the UI layer. It is not in `Game` and is never saved. It starts on the Enemy tab, and the UI returns to the Enemy tab after a draw or a release and when a stage starts. Selecting and swapping loadout slots does not reset it.
- **The page never scrolls.** The screen is sized to the viewport height (using the dynamic viewport unit and safe-area insets), and only the log and the loadout list scroll inside their own area. The enemy image shrinks on short screens so the HP meter keeps its size.
- **Icon-only tabs and buttons need accessible labels.**
- The UI still never computes scores or backfires itself; it reads them from the game state and the trace.

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

The reference casts from the overview. With Cracked Staff in slot 1, fixed Fire, and Pierce in slot 2:

- Cast 1 (draw 5, Unstable, 3) scores **84**.
- Cast 2 (one burn stack, draw 4, 4) scores **52**.
- With Pierce in slot 1 and Staff in slot 2, the fixed Fire remains between them and cast 1 scores **64**, which proves slot order matters without making the element movable.
- Drawing a second Unstable card in one cast scores **0**.
