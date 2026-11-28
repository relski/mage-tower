import type { ChannelCard } from "../core/types";
import {
  buy,
  cancelPending,
  chooseReward,
  draw,
  getGame,
  nextStage,
  pick,
  release,
  restart,
  selectSlot,
  sellCard,
  skipReward,
  subscribe,
} from "../state/game";
import type { CastReport, Game } from "../state/game";
import { playCast } from "./animation/cast-playback";
import type { CastPlayback } from "./animation/cast-playback";
import { castTimeline, drainDamage } from "./animation/cast-timeline";
import type { DrainFrame } from "./animation/cast-timeline";
import { playSound, toggleMuted, unlockAudio } from "./audio/sound";
import { hpLabel } from "./components/enemy-panel";
import { DEFAULT_TAB, isTabName } from "./components/tab-section";
import type { TabName } from "./components/tab-section";
import { pickScreen } from "./screens/pick-screen";
import { rewardScreen } from "./screens/reward-screen";
import { DEFAULT_SHOP_TAB, isShopTab, shopScreen } from "./screens/shop-screen";
import type { ShopTab } from "./screens/shop-screen";
import { stageScreen } from "./screens/stage-screen";
import type { CastView, UiState } from "./ui-state";

// Mounts the UI: renders the current screen, and turns clicks into store calls.
// The screens are in ui/screens and their panels in ui/components; this file keeps the
// UI-only state (see ui-state.ts) and the cast animation's playback.

// how long a failed cast stays on screen before the channel clears
const BACKFIRE_PREVIEW_MS = 1500;

function view(game: Game, ui: UiState): string {
  let screen: string;

  if (game.stage === null) {
    screen = pickScreen(game);
  } else if (game.phase === "reward") {
    screen = rewardScreen(game, game.stage, ui);
  } else if (game.phase === "shop") {
    screen = shopScreen(game, ui);
  } else {
    screen = stageScreen(game, game.stage, ui);
  }

  return `<main class="game">${screen}</main>`;
}

export function mountApp(root: HTMLElement): void {
  // every screen fits the screen height, so the page itself never scrolls (see stage-layout.css)
  root.classList.add("fit-screen");

  // UI-only state (see ui-state.ts), never saved
  let backfirePreview: readonly ChannelCard[] | null = null;
  let backfireTimeout: number | null = null;
  let menuOpen = false;
  // The card reward waiting for a Yes or No in the confirmation popup (an index into the reward options).
  let confirmReward: number | null = null;
  // The selected tab of the stage screen. It goes back to the default after every draw and
  // release and when a stage starts, but not when loadout slots are selected or swapped
  // (a swap takes two taps on the Loadout tab).
  let activeTab: TabName = DEFAULT_TAB;
  // The selected tab of the shop. It goes back to the default when the shop is left, and after a
  // bought card has been placed or cancelled. Buying a card moves to the Loadout tab to place it.
  let shopTab: ShopTab = DEFAULT_SHOP_TAB;

  // The cast animation. While it plays, the screen shows the game as it was just before the
  // release (report.before) and not the new one, so a cast that clears or fails the stage does
  // not jump to the next screen before the animation ends. Any tap skips it.
  let playback: { report: CastReport, runner: CastPlayback | null } | null = null;
  let castView: CastView | null = null;
  let playedCast: CastReport | null = null; // the latest report handled, so each plays only once

  const reducedMotion = (): boolean =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // while the meter drains, the HP number and the meter are changed in place, not re-rendered
  const showDrain = (report: CastReport, frame: DrainFrame, progress: number): void => {
    const remaining = Math.max(0, Math.round(report.targetHp - drainDamage(frame, progress)));
    const meter = root.querySelector<HTMLMeterElement>("#stage-hp");
    const label = root.querySelector<HTMLElement>('label[for="stage-hp"]');

    if (meter) {
      meter.value = remaining;
    }

    if (label) {
      label.textContent = hpLabel(remaining, report.targetHp);
    }
  };

  // the sound for a cast that ended the stage or the run (nothing when it did neither)
  const playOutcome = (game: Game): void => {
    const status = game.stage?.status;

    if (status === "failed") {
      playSound("lost");
    } else if (status === "cleared") {
      playSound("clear");
    }
  };

  // each trace step re-renders the enemy picture with the new total (which restarts its pop),
  // then the meter drains, then the real game is shown. Each step also sounds a little higher.
  const beginPlayback = (report: CastReport): CastPlayback => {
    let steps = 0;

    return playCast(castTimeline(report.trace, report.damageBefore, report.damageAfter), {
      onStep: (frame) => {
        playSound("step", Math.min(2, 1 + steps * 0.08));
        steps += 1;
        castView = { total: frame.total, text: `${frame.source}: ${frame.description}`, hit: false };
        render();
      },
      onDrainStart: () => {
        playSound("hit");
        castView = { total: report.score, text: "Damage dealt", hit: true };
        render();
      },
      onDrain: (frame, progress) => showDrain(report, frame, progress),
      onDone: () => {
        playback = null;
        castView = null;
        playOutcome(getGame());
        render();
      },
    });
  };

  const clearBackfirePreview = (): void => {
    if (backfireTimeout !== null) {
      window.clearTimeout(backfireTimeout);
      backfireTimeout = null;
    }

    backfirePreview = null;
  };

  const render = (): void => {
    const current = getGame();
    const report = current.lastCast;
    let started: CastReport | null = null;

    // a cast that was just released and has not played yet starts its animation
    // (a backfire has the red channel instead, and reduced motion skips the animation)
    if (playback === null && report !== null && report !== playedCast) {
      playedCast = report;

      if (!report.backfired && !reducedMotion()) {
        playback = { report, runner: null };
        started = report;
      } else if (!report.backfired) {
        // no animation (reduced motion), so the hit and the result are heard right away
        playSound("hit");
        playOutcome(current);
      }
    }

    const active = playback;
    const game = active !== null ? active.report.before : current;

    // the part of the screen that scrolls keeps its place when the markup is replaced
    // (but not when it shows something else, which its scroll key tells)
    const previousBody = root.querySelector<HTMLElement>("[data-scroll-key]");
    const previousKey = previousBody?.dataset.scrollKey;
    const previousScroll = previousBody?.scrollTop ?? 0;

    // the log scrolls inside itself: remember whether the player had scrolled up from the newest line
    const previousLog = root.querySelector<HTMLElement>(".log");
    const logWasScrolledUp =
      previousLog !== null &&
      previousLog.scrollHeight - previousLog.scrollTop - previousLog.clientHeight > 8;
    const previousLogScroll = previousLog?.scrollTop ?? 0;

    root.innerHTML = view(game, {
      backfirePreview,
      cast: castView,
      menuOpen,
      activeTab,
      shopTab,
      confirmReward,
    });

    const body = root.querySelector<HTMLElement>("[data-scroll-key]");

    if (body && body.dataset.scrollKey === previousKey) {
      body.scrollTop = previousScroll;
    }

    // show the newest log lines, unless the player had scrolled up to read older ones
    const log = root.querySelector<HTMLElement>(".log");

    if (log) {
      log.scrollTop = logWasScrolledUp ? previousLogScroll : log.scrollHeight;
    }

    // the animation starts after its first screen is in place (its first frame renders again)
    if (started !== null && active !== null) {
      active.runner = beginPlayback(started);
    }
  };

  root.addEventListener("click", (event) => {
    // browsers only start audio after a tap
    unlockAudio();

    // while a cast plays, any tap skips the animation and does nothing else
    if (playback !== null) {
      playback.runner?.skip();
      return;
    }

    const target = event.target instanceof Element ? event.target : null;
    const button = target?.closest<HTMLButtonElement>("button[data-action]");

    if (!button || button.disabled) {
      return;
    }

    // any other button closes the menu (the sound switch keeps it open, to show its new state)
    const action = button.dataset.action;
    const menuWasOpen = menuOpen;

    if (action !== "menu" && action !== "mute") {
      menuOpen = false;
    }

    switch (action) {
      case "menu":
        menuOpen = !menuOpen;
        render();
        break;
      case "mute":
        // the tap is heard only when sound has just been turned on
        toggleMuted();
        playSound("tap");
        render();
        break;
      case "tab": {
        const tab = button.dataset.tab;

        if (isTabName(tab)) {
          activeTab = tab;
          playSound("tap");
          render();
        }
        break;
      }
      case "shop-tab": {
        const tab = button.dataset.tab;

        if (isShopTab(tab)) {
          shopTab = tab;
          playSound("tap");
          render();
        }
        break;
      }
      case "pick":
        activeTab = DEFAULT_TAB;
        playSound("tap");
        pick(button.dataset.id ?? "");
        break;
      case "draw": {
        const before = getGame();

        activeTab = DEFAULT_TAB;
        draw();

        // the game state remembers a backfired channel; the UI only shows it for a moment
        const after = getGame();
        const failedChannel = after !== before ? after.lastBackfire : null;

        if (after !== before) {
          const channel = after.stage?.channel ?? [];

          if (failedChannel !== null) {
            playSound("backfire");
          } else if (channel[channel.length - 1]?.kind === "unstable") {
            playSound("unstable");
          } else {
            playSound("draw");
          }
        }

        if (failedChannel !== null) {
          clearBackfirePreview();
          backfirePreview = failedChannel;
          render();
          backfireTimeout = window.setTimeout(() => {
            backfirePreview = null;
            backfireTimeout = null;
            render();
          }, BACKFIRE_PREVIEW_MS);
        }
        break;
      }
      case "release":
        activeTab = DEFAULT_TAB;
        release();
        break;
      case "reward": {
        const index = Number(button.dataset.index);

        // a modifier or an item asks first; the other rewards are taken right away
        if (getGame().rewardOptions[index]?.kind === "card") {
          confirmReward = index;
          playSound("tap");
          render();
        } else {
          playSound("place");
          chooseReward(index);
        }
        break;
      }
      case "confirm-reward": {
        const index = confirmReward;

        confirmReward = null;

        if (index !== null) {
          playSound("place");
          chooseReward(index);
        }
        break;
      }
      case "cancel-reward":
        confirmReward = null;
        playSound("tap");
        render();
        break;
      case "skip":
        playSound("tap");
        skipReward();
        break;
      case "buy": {
        const goldBefore = getGame().gold;

        buy(Number(button.dataset.index));

        // only a purchase that went through is heard
        if (getGame().gold < goldBefore) {
          playSound("coin");
        }

        // a bought card has to be placed in the loadout
        if (getGame().pendingCard !== null) {
          shopTab = "loadout";
          render();
        }
        break;
      }
      case "cancel":
        playSound("tap");
        cancelPending();
        shopTab = DEFAULT_SHOP_TAB;
        render();
        break;
      case "next":
        playSound("tap");
        activeTab = DEFAULT_TAB;
        shopTab = DEFAULT_SHOP_TAB;
        nextStage();
        break;
      case "slot": {
        const wasPlacing = getGame().pendingCard !== null;

        selectSlot(Number(button.dataset.slot));

        // after a card is placed, go back to buying
        if (wasPlacing && getGame().pendingCard === null) {
          playSound("place");
          shopTab = DEFAULT_SHOP_TAB;
          render();
        } else {
          playSound("tap");
        }
        break;
      }
      case "sell": {
        const goldBefore = getGame().gold;

        sellCard(Number(button.dataset.slot));

        if (getGame().gold > goldBefore) {
          playSound("coin");
        }
        break;
      }
      case "restart":
        activeTab = DEFAULT_TAB;
        shopTab = DEFAULT_SHOP_TAB;
        clearBackfirePreview();
        restart();
        break;
      case "abandon":
        // the run is saved automatically, so abandoning it is the only way to start over
        if (window.confirm("Abandon this run? Your progress will be lost.")) {
          activeTab = DEFAULT_TAB;
          shopTab = DEFAULT_SHOP_TAB;
          clearBackfirePreview();
          restart();
        }
        break;
    }

    // closing the menu is a change even when the action itself changed no game state
    const closedSomething = menuWasOpen && !menuOpen;

    if (closedSomething && action !== "menu") {
      render();
    }
  });

  subscribe(render);

  // Escape answers No in the confirmation popup
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && confirmReward !== null) {
      confirmReward = null;
      render();
    }
  });

  render();
}
