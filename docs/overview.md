# Mage Tower: Prototype Project Document

Working title. Browser game, TypeScript, mobile-first. Draft v0.3, November 23, 2026.

Version history:

- v0.1 used fully automatic casts.
- v0.2 replaced that with the channel-deck loop, because automatic casts made the first round a guaranteed win.
- v0.3 brings the document in line with the code after Phases 1 to 3: elements, 16 modifiers and 10 items, three stages with a boss rule, rewards, a shop, gold and slot unlocks.

## 1. Pitch

You are a mage who wakes outside a tower with no memory. The only thing you carry is a worn deck of cards, and when you hold them, spells come naturally. You walk inside and climb. Each round is harder than the last, and each death sends you back outside with fragments of memory that unlock new cards and starting options.

It is a roguelike in the spirit of Slay the Spire and Balatro: your magic is assembled from cards, and every run you rebuild into something new.

## 2. Prototype goals

The prototype exists to answer one question: **is deciding when to stop channeling, and arranging a loadout of cards to amplify the result, fun?**

Success criteria:

- A player can clear a round (three stages) in under 5 minutes.
- Every cast involves a real decision (draw another card or release), and a bad draw can fail even the easy stage, though rarely.
- Changing card order or swapping a loadout card visibly changes the score, and the player can see why.
- Each of the four elements plays noticeably differently.
- The game is comfortable to play with one thumb on a phone.

## 3. Core mechanics

### Terms

- **Loadout cards:** element, modifier and item cards. They sit in five slots (three unlocked at the start) and amplify every cast.
- **Channel deck:** number cards and Unstable cards. You draw from it each cast. It sets the raw power and the risk.
- **Cast:** one channel (draw cards, then release) followed by loadout scoring.
- **Power:** the sum of the number cards drawn in a cast.
- **Damage:** the running total that starts as power × multiplier, is built on by loadout cards, and is subtracted from enemy HP.
- **Stage:** one enemy with HP. Cleared by dealing enough total damage within the cast limit.
- **Round:** three stages. A run is a series of rounds.
- **Gold, reward, shop:** what a cleared stage gives and where it is spent (see Rewards and shop).

### Run start

1. Pick one base element.
2. Receive one random modifier and one random item.
3. Receive the starting channel deck (20 cards, see below).

### Loadout

Five slots. Slots 1 to 3 start unlocked and filled, in the order item, element, modifier. Slots 4 and 5 start **locked** and are unlocked in the shop. Potions are a later addition.

Loadout cards trigger **left to right**, so slot order is a core decision. Two slots can be swapped by clicking them, but only while the channel is empty, so the rules cannot change in the middle of a cast.

### Rounds and stages

A round has three stages, four casts each:

| Stage | Enemy | HP | Rule |
| --- | --- | --- | --- |
| 1 | Goblin Scout (easy mob) | 250 | none |
| 2 | Stone Ogre (medium enemy) | 300 | none |
| 3 | Tower Warden (round boss) | 300 | channel multiplier capped at ×2 |

Dealing damage equal to the enemy's HP before running out of casts clears the stage. Running out of casts ends the run. Clearing the boss wins the round. All numbers are placeholders to tune with playtests.

### Channel deck and casting

**Starting channel deck (20 cards):** 14 number cards (two each of 1 to 7) and 6 Unstable cards. Unstable cards add no power. The deck belongs to the run: rewards and the shop change it, and every stage starts from the run's deck, shuffled.

**Each cast:**

1. **Channel.** Draw one card at a time from the draw pile. Number cards add their value to the cast's **power**. Unstable cards add nothing.
2. **Multiplier.** It depends on how many cards you have drawn this cast:

   | Cards drawn | 1 | 2 | 3 | 4 | 5 |
   | --- | --- | --- | --- | --- | --- |
   | Multiplier | ×1 | ×1.5 | ×2 | ×2.5 | ×3 |

3. **Release** whenever you like. The channel closes and releases automatically at 5 cards.
4. **Backfire.** When the number of Unstable cards in the channel reaches the **Unstable limit** (2 by default, so the second one), the cast scores 0 and uses up the cast.
5. Drawn cards go to the discard pile after the cast.

Details:

- The draw pile **persists across casts within a stage**. Unstable cards drawn safely move to the discard pile, so later casts are safer. Remembering what is left matters.
- An Unstable card counts as a drawn card for the multiplier. The first one is a free multiplier step with no power. The second is the danger.
- A backfire costs only the cast. There is no other penalty for now.
- If the draw pile runs out mid-stage, the player cannot draw and has to release.

Illustrative backfire odds for a fresh 20-card deck with 6 Unstable (calculated by hand, and they change as the deck changes):

| Cards drawn | 2 | 3 | 4 | 5 |
| --- | --- | --- | --- | --- |
| Chance of having backfired | ~8% | ~20% | ~34% | ~48% |

With these numbers the sweet spot for a plain deck is around 3 to 4 cards. The Unstable count is the main tuning knob: with 4 Unstable cards instead of 6, drawing more was always the better choice.

### Channel rules

Three rules shape the channel during a stage. They start at their defaults and are changed by the loadout and by the stage's own rule:

| Rule | Default | Changed by |
| --- | --- | --- |
| Unstable limit | 2 | Earth and Ward (+1), Glass Cannon (−1), a boss rule (±N). Never below 1 |
| Multiplier cap | none | a boss rule (the Tower Warden caps it at ×2) |
| Half value above | none | a boss rule (number cards above the threshold count as half, rounded down) |

### Scoring a cast

1. **Starting total** = channel power × channel multiplier, rounded down.
2. **Loadout cards** trigger left to right on the running total. An effect has a trigger and an action:
   - Triggers: always, first cast, every Nth cast, chance (rolls the seeded RNG), and when the channel has an Unstable card.
   - Actions: add damage, multiply the total, add a stack, add damage per stack, and add Unstable tolerance (a channel rule, applied while channeling rather than while scoring).
3. A multiply step applies to the running total at that moment, which is why card order matters.
4. The final total is the cast's damage. Damage adds up across casts within a stage.

Scores are whole numbers: the total is rounded down after every multiplication. A trace records every step so the UI can show and animate exactly what happened.

### Elements

| Element | Identity | Numbers |
| --- | --- | --- |
| Fire | **Burn:** each cast adds a burn stack, and later casts gain bonus damage per stack | +20 damage, +6 per stack |
| Ice | **Rhythm:** every 3rd cast is frozen and scores a large multiplier | +15 damage, 3rd cast ×3 |
| Lightning | **Surge:** a chance to trigger a bonus, plus a bonus when the channel has an Unstable card | +20 damage, 25% chance of ×2, +15 damage with an Unstable card |
| Earth | **Reserves:** the channel tolerates one more Unstable card, so backfire happens on the 3rd instead of the 2nd | +15 damage, tolerance +1 |

All numbers are placeholders and live in data files.

### Modifiers (16)

| Modifier | Effect |
| --- | --- |
| Pierce | ×1.5 on every cast |
| Twin | ×2 on every 2nd cast |
| Opener | ×2.5 on the first cast of a stage |
| Hex | ×1.75 when the channel has an Unstable card |
| Thrice | ×2.5 on every 3rd cast |
| Finisher | ×2.5 on every 4th cast |
| Gambler | 40% chance of ×2 |
| Longshot | 25% chance of ×3 |
| Fortune | 50% chance of ×1.75 |
| Backdraft | +10 damage, then ×1.5 when the channel has an Unstable card |
| Ward | the channel backfires on one more Unstable card |
| Glass Cannon | ×2.5 on every cast, but the channel backfires on one fewer Unstable card |
| Kindle | +8 damage per burn stack, then gain a burn stack |
| Wildfire | +4 damage per burn stack, then gain 2 burn stacks |
| Steady | ×1.3 on every cast |
| Quicken | +40 damage on every 2nd cast |

### Items (10)

| Item | Effect |
| --- | --- |
| Cracked Staff | +20 damage on the first cast of a stage |
| Iron Ring | +12 damage on every cast |
| Lucky Coin | 30% chance of +50 damage |
| Static Rod | +25 damage when the channel has an Unstable card |
| Ember Charm | +6 damage per burn stack, then gain a burn stack |
| Lead Weight | +25 damage on every 2nd cast |
| Rabbit’s Foot | 25% chance of +75 damage |
| Fuse Wire | +60 damage on every 4th cast |
| Hourglass | +5 damage on every cast, and +25 more on the first |
| Gambler’s Die | 50% chance of +30 damage |

### Boss rules

The engine supports three kinds of stage rule:

- **Unstable limit change:** for example, only 1 Unstable card allowed before a backfire.
- **Multiplier cap:** the channel multiplier cannot go above a value (used by the Tower Warden, at ×2).
- **Half value above:** number cards above a threshold count as half value, rounded down.

### Rewards and shop

**Gold.** Clearing a stage that is not the last pays 10 gold plus 5 for every cast left over.

**Reward pick.** After such a stage the player picks 1 of 3 options, or skips for 10 gold:

- a random modifier and a random item (preferring cards not already in the loadout), or
- one change to the channel deck: add a number card (6 to 9), remove the lowest number card, or remove an Unstable card.

A card reward is held until the player clicks an unlocked slot, and it replaces whatever is in that slot. The player can cancel and pick something else.

**Shop.** After the reward pick, the shop offers:

| Offer | Price |
| --- | --- |
| A random modifier | 20 |
| A random item | 20 |
| Remove an Unstable card from the channel deck (only if the deck has one) | 15 |
| Unlock slot 4, then slot 5 | 25, then 40 |

A bought card is paid for when it is placed in a slot. Leaving the shop starts the next stage. Clearing the boss wins the round, with no reward or shop.

**Growth paths.** There are three ways to get stronger: the loadout (new cards, slot order and unlocked slots), the channel deck (numbers added or removed, fewer Unstable cards), and gold spent in the shop.

### Reference casts (test cases)

Loadout order: Cracked Staff (+20 damage on the first cast of a stage), Fire (+20 damage, +6 per burn stack, then gain a burn stack), Pierce (×1.5).

- **Cast 1:** draw 5, Unstable, 3, then release. Power is 8, three cards gives ×2, so 16. Staff +20 = 36, Fire +20 = 56, Pierce ×1.5 = **84**.
- **Cast 2** (1 burn stack): draw 4, 4, then release. Power is 8, two cards gives ×1.5, so 12. Staff is inactive. Fire +20 +6 = 38. Pierce ×1.5 = **57**.
- **Order test:** with the loadout reordered to Fire, Pierce, Staff, the same cast 1 draws give 16 +20 = 36, ×1.5 = 54, +20 = **74**.
- **Backfire test:** draw Unstable, then Unstable. The cast scores **0**.

These replace the v0.1 reference round, and they depend on Fire, Pierce and Cracked Staff keeping their current numbers.

## 4. Prototype scope

**In scope**

- 4 base elements, 16 modifiers, 10 items
- Starting loadout: choose 1 element, receive 1 random modifier and 1 random item
- Starting channel deck of 20 cards (14 numbers, 6 Unstable)
- 1 round of 3 stages (easy mob, medium enemy, boss with one special rule)
- Channel casting: draw, release, backfire, multiplier steps
- Gold, a reward pick after each stage, a shop, and slot unlocks
- Reorder loadout cards by clicking two slots
- Text UI first, then a real mobile UI with cast animation (number popups and a running total)

**Out of scope for now**

- Potions, meta-progression, and memory fragments
- Multiple rounds, tower story content, and audio polish
- Suits, special effects, or upgrades on channel cards
- Enemy element affinities
- Save system beyond the current run

## 5. Technical approach

- **Language:** TypeScript.
- **Platform:** browser, mobile-first (portrait layout, large tap targets).
- **Structure:** a pure-logic game core with no UI dependencies (cards, channel, loadout, scoring, stage state, rewards, shop), and a separate UI layer. The core can then be unit-tested without rendering.
- **First UI:** a plain text UI in the page for fast feedback. Real UI and animation come after the loop feels good.
- **Rendering:** DOM and CSS, since the game is mostly cards, text, and number animation.
- **Tooling:** Vite for the dev server and build, and Vitest for tests.
- **Data-driven content:** cards defined as data (TypeScript objects) with effect hooks, so adding a card does not mean rewriting the engine.
- **More detail:** see [architecture.md](./architecture.md) for the folder structure and code conventions.

## 6. Data model

- **Card (loadout card):** id, name, type (element, modifier, item), an optional one-line description for the UI, and effects.
- **Effect:** a trigger and an action (see Scoring a cast).
- **Loadout:** an ordered list of 5 slots, each empty or holding a card. Only the first `unlockedSlots` slots can be used.
- **ChannelCard:** either a number card (with a value) or an Unstable card.
- **StageConfig:** name, HP, casts and an optional stage rule. **StageRule:** unstable limit change, multiplier cap, or half value above.
- **ChannelRules:** the effective Unstable limit, multiplier cap and half-value threshold for a stage (defaults, plus the loadout, plus the stage rule).
- **Stage state:** name, rule, target HP, casts remaining, cast number, total damage, draw pile, discard pile, current channel, burn stacks, status, and the RNG seed.
- **RewardOption and ShopOffer:** see Rewards and shop.
- **Game:** the phase, the run's seed, stage index, loadout, unlocked slots, channel deck, gold, the current stage state, reward options, shop offers, a card waiting for a slot, the selected slot, and the log.

## 7. Milestones

1. **Channel and scoring engine:** draw pile, multiplier, backfire, loadout scoring, and the reference casts passing as tests. *Done.*
2. **Stage loop:** HP, cast limits, win and lose states, as a text UI. *Done.*
3. **Elements and stages:** Fire, Ice, Lightning and Earth, the three-stage round, and a boss rule. *Done.*
4. **Run flow:** rewards, deck changes, shop, and slot unlocks. *Done.*
5. **Real UI:** mobile layout, cast animation, and reordering.
6. **Playtest and tune:** Unstable count, multiplier steps, HP, prices, and pacing.

## 8. Risks

- **Tuning the gamble:** with too few Unstable cards or generous multipliers, drawing more is always right. With too many, it is never right. Simulations of the starting deck show the best stopping point is around 3 to 4 cards.
- **Luck against skill:** a bad draw can fail a stage. Deck-building and tolerance effects need to give the player real control over the odds, or it will feel unfair.
- **Loadout order may feel minor** next to the channel decision. Playtests should check that rearranging still matters.
- **Balance:** multiplicative stacking can run away quickly, so stage HP must be tuned alongside card power. A simulation of every element, modifier and item combination (best fixed stopping strategy) gave average clear rates of about 78%, 60% and 46% for the three stages.
- **Earth against the boss:** Earth is the strongest element on normal stages but the weakest against the ×2 multiplier cap, because its power comes from drawing deep.
- **Run economy:** gold is about 25 per stage and a card costs 20, which allows roughly one purchase per shop. A simple bot that always releases after 3 cards wins only a few percent of runs, so difficulty and growth need a human playtest.
- **Text prototype limits:** a text UI can hide feel problems that animation would fix, and the reverse.

## 9. Decisions and rejected ideas

- **Automatic casts (loadout only):** rejected. Outcomes were fully determined by the loadout, so the first round was always a win.
- **Mana hand with poker-style combos (pairs, runs, triples):** rejected as too close to Balatro.
- **Overchannel with a capacity limit (bust when the sum goes over):** rejected as too close to blackjack.
- **Channel lever (skip a cast to bank a charge):** dropped for now.
- **Chosen:** a channel deck with Unstable cards. The risk comes from specific cards, not from a sum, and the multiplier comes from how many cards you dare to draw.
- **Naming:** the third loadout card type is called `item` (not gear), the score is called damage (not chips), and the ×1.5 modifier is called Pierce (not Echo).
- **Rounding:** scores round down after every multiplication.
- **Seeded randomness:** all randomness goes through a seeded generator, and its state lives in the stage state, so runs and tests are repeatable.
- **Auto-release:** the channel releases by itself at 5 cards or on a backfire. This rule lives in the core, not in the UI.
- **Reward flow:** a reward pick after every stage except the last, then the shop, then the next stage.
- **Locked slots:** slots 4 and 5 start locked and are unlocked with gold.
- **Reordering:** allowed on the stage, reward and shop screens, but only while the channel is empty.
- **Boss rule:** the Tower Warden caps the channel multiplier at ×2. Other rules were simulated (half value above 5, a lower Unstable limit) and punished Earth as much or more, or were far too harsh.

## 10. Open questions

- When the draw pile runs out mid-stage, should the discard pile reshuffle into it? (Today the player simply cannot draw.)
- How do rounds map to tower floors, if at all?
- How strict should the cast limit be (4 casts, or more with scaling)?
- Should Earth have a different identity, or the boss a different rule, so Earth is not so weak against the boss?
- Is the run economy right (gold per stage, prices, number of purchases)?
