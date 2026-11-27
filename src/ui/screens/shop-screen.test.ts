import { describe, expect, it } from "vitest";
import { makeState } from "../../core/test-helpers";
import { applyPick, createGame } from "../../state/game";
import type { Game } from "../../state/game";
import type { UiState } from "../ui-state";
import { shopScreen } from "./shop-screen";

const ui: UiState = {
  backfirePreview: null,
  cast: null,
  menuOpen: false,
  activeTab: "enemy",
  shopTab: "buy",
  confirmReward: null,
};

function shopGame(stageIndex: number): Game {
  return {
    ...applyPick(createGame(1), "fire"),
    phase: "shop",
    stage: makeState({ status: "cleared" }),
    stageIndex,
  };
}

describe("shop round progress", () => {
  it.each([
    [0, ["is-complete", "is-next", "is-upcoming"]],
    [1, ["is-complete", "is-complete", "is-next"]],
    [2, ["is-complete", "is-complete", "is-complete"]],
  ])("shows progress after stage %i", (stageIndex, states) => {
    const html = shopScreen(shopGame(stageIndex), ui);
    const steps = [...html.matchAll(/class="round-progress-step ([^"]+)"/g)];

    expect(steps.map((step) => step[1])).toEqual(states);
    expect(html.indexOf('class="round-progress"')).toBeLessThan(
      html.indexOf('data-action="next"'),
    );

    if (stageIndex === 2) {
      expect(html).not.toContain('aria-current="step"');
    } else {
      expect(html).toContain('aria-current="step"');
    }
  });
});
