import { channelMultiplier, channelPower, isBackfired, unstableCount } from "../core/channel";
import { canDraw, canRelease } from "../core/round";
import { describeReward, describeOffer } from "../core/run";
import { describeRule } from "../core/rules";
import type { ChannelCard } from "../core/types";
import { ELEMENTS } from "../data/cards/elements";
import { ROUND_STAGES } from "../data/stages/rounds";
import { SELL_CARD_PRICE } from "../data/tuning";
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
  rulesFor,
  selectSlot,
  sellCard,
  skipReward,
  subscribe,
} from "../state/game";
import type { Game } from "../state/game";

// plain text UI: shows the state of the game and a few buttons

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function cardLabel(card: ChannelCard): string {
  return card.kind === "unstable" ? "Unstable" : String(card.value);
}

function channelText(
  game: Game,
  channel: readonly ChannelCard[] = game.stage?.channel ?? [],
): string {
  if (game.stage === null || channel.length === 0) {
    return `<p class="muted">(empty)</p>`;
  }

  const rules = rulesFor(game);
  const power = channelPower(channel, rules);
  const multiplier = channelMultiplier(channel.length, rules);
  const count = unstableCount(channel);
  const cards = channel
    .map(
      (card) => `
        <div class="channel-card ${card.kind}" role="listitem">
          ${escapeHtml(cardLabel(card))}
        </div>`,
    )
    .join("");

  return `
    <div class="channel-cards" role="list" aria-label="Drawn channel cards">${cards}</div>
    <p class="channel-stats">Power ${power} × ${multiplier} · Unstable ${count}/${rules.unstableLimit}</p>`;
}

// the five loadout slots, as buttons you can click to swap two of them
// (or to place a card you are holding)
function loadoutView(game: Game, interactionLocked = false): string {
  const pending = game.pendingCard;
  const canClick =
    !interactionLocked &&
    (pending !== null ||
      (game.phase === "stage" && game.stage !== null && game.stage.channel.length === 0) ||
      game.phase === "reward" ||
      game.phase === "shop");

  const slots = game.loadout
    .map((card, index) => {
      if (index >= game.unlockedSlots) {
        return `
        <button class="slot locked" data-action="slot" data-slot="${index}" disabled>
          <span class="slot-name">[${index + 1}] (locked)</span>
        </button>`;
      }

      const selected = game.selectedSlot === index ? " selected" : "";
      const name = card ? escapeHtml(card.name) : "(empty)";
      const description = card?.description ? escapeHtml(card.description) : "";

      return `
        <button class="slot${selected}" data-action="slot" data-slot="${index}" ${canClick ? "" : "disabled"}>
          <span class="slot-name">[${index + 1}] ${name}</span>
          <span class="slot-text">${description}</span>
        </button>`;
    })
    .join("");

  const hint = interactionLocked
    ? "The failed cast is clearing."
    : pending
      ? `Click a slot to place ${escapeHtml(pending.card.name)} (it replaces the card there).`
      : canClick
        ? "Loadout cards trigger left to right; your element stays fixed between slots 1 and 2. Click two slots to swap them."
        : "Release the channel to reorder.";

  const cancel = pending ? `<button class="small" data-action="cancel">Cancel</button>` : "";

  return `
    <section class="panel">
      <h2>Loadout</h2>
      <p class="muted">${hint}</p>
      <div class="slots">${slots}</div>
      ${cancel}
    </section>`;
}

function pickView(game: Game): string {
  const choices = ELEMENTS.map(
    (card) => `
      <button class="choice" data-action="pick" data-id="${escapeHtml(card.id)}">
        <span class="slot-name">${escapeHtml(card.name)}</span>
        <span class="slot-text">${escapeHtml(card.description ?? "")}</span>
      </button>`,
  ).join("");

  return `
    <section class="panel">
      <h2>Choose your element</h2>
      <p class="muted">Your element stays fixed outside the loadout. You also get a random modifier and item.</p>
      <div class="choices">${choices}</div>
    </section>
    <pre class="log">${escapeHtml(game.log.join("\n"))}</pre>`;
}

function summaryView(game: Game, stage: NonNullable<Game["stage"]>): string {
  const rule = stage.rule !== null ? `<p>Rule: ${escapeHtml(describeRule(stage.rule))}</p>` : "";
  const remainingHp = Math.max(0, stage.targetHp - stage.totalDamage);

  return `
    <section class="panel">
      <p>Round ${game.roundNumber} · Stage ${game.stageIndex + 1}/${ROUND_STAGES.length} · ${escapeHtml(stage.name)}</p>
      <p>Element ${escapeHtml(game.element?.name ?? "none")}</p>
      <div class="damage-meter">
        <label for="stage-hp">Enemy HP ${remainingHp} / ${stage.targetHp}</label>
        <meter id="stage-hp" min="0" max="${stage.targetHp}" value="${remainingHp}">
          ${remainingHp} of ${stage.targetHp}
        </meter>
      </div>
      <p>Casts left ${stage.castsRemaining} · Gold ${game.gold}</p>
      ${rule}
    </section>`;
}

function logView(game: Game): string {
  return `<pre class="log">${escapeHtml(game.log.join("\n"))}</pre>`;
}

function rewardView(game: Game, stage: NonNullable<Game["stage"]>): string {
  const waiting = game.pendingCard !== null;

  const options = game.rewardOptions
    .map(
      (option, index) => `
      <button class="choice" data-action="reward" data-index="${index}" ${waiting ? "disabled" : ""}>
        <span class="slot-text">${escapeHtml(describeReward(option))}</span>
      </button>`,
    )
    .join("");

  return `
    ${summaryView(game, stage)}
    <section class="panel">
      <h2>Reward</h2>
      <p class="muted">${escapeHtml(stage.name)} is down. Pick one.</p>
      <div class="choices">${options}</div>
      <button class="small" data-action="skip" ${waiting ? "disabled" : ""}>Skip for gold</button>
    </section>
    ${loadoutView(game)}
    ${logView(game)}`;
}

function shopView(game: Game, stage: NonNullable<Game["stage"]>): string {
  const waiting = game.pendingCard !== null;
  const startsNextRound = game.stageIndex === ROUND_STAGES.length - 1;

  const offers =
    game.shopOffers.length === 0
      ? `<p class="muted">Sold out.</p>`
      : game.shopOffers
          .map((offer, index) => {
            const disabled = waiting || game.gold < offer.price ? "disabled" : "";

            return `
      <button class="choice" data-action="buy" data-index="${index}" ${disabled}>
        <span class="slot-name">${offer.price} gold</span>
        <span class="slot-text">${escapeHtml(describeOffer(offer))}</span>
      </button>`;
          })
          .join("");

  const sellOptions = game.loadout
    .map((card, slot) =>
      card !== null && card.type !== "element" && slot < game.unlockedSlots
        ? `
        <button class="choice" data-action="sell" data-slot="${slot}" ${waiting ? "disabled" : ""}>
          <span class="slot-name">Sell ${escapeHtml(card.name)}</span>
          <span class="slot-text">Receive ${SELL_CARD_PRICE} gold</span>
        </button>`
        : "",
    )
    .join("");

  return `
    ${summaryView(game, stage)}
    <section class="panel">
      <h2>Shop</h2>
      <p class="muted">
        You have ${game.gold} gold.
        ${startsNextRound ? `Prepare for Round ${game.roundNumber + 1}.` : ""}
      </p>
      <div class="choices">${offers}</div>
    </section>
    <section class="panel">
      <h2>Sell a loadout card</h2>
      <div class="choices">
        ${sellOptions || `<p class="muted">No loadout cards to sell.</p>`}
      </div>
    </section>
    ${loadoutView(game)}
    <div class="actions">
      <button data-action="next" ${waiting ? "disabled" : ""}>
        ${startsNextRound ? `Begin Round ${game.roundNumber + 1}` : "Next stage"}
      </button>
    </div>
    ${logView(game)}`;
}

function stageView(
  game: Game,
  stage: NonNullable<Game["stage"]>,
  backfirePreview: readonly ChannelCard[] | null,
): string {
  const unstableLeft = unstableCount(stage.drawPile);
  const rules = rulesFor(game);

  const banner =
    game.phase === "lost" ? `<p class="banner lose">Out of casts. The run is over.</p>` : "";

  const actions =
    game.phase === "lost"
      ? `<button data-action="restart">New game</button>`
      : `
      <button data-action="draw" ${!backfirePreview && canDraw(stage, rules) ? "" : "disabled"}>Draw</button>
      <button data-action="release" ${!backfirePreview && canRelease(stage) ? "" : "disabled"}>Release</button>`;

  return `
    ${summaryView(game, stage)}

    ${loadoutView(game, backfirePreview !== null)}

    <section class="panel">
      <h2>Deck</h2>
      <p>Draw pile ${stage.drawPile.length} (Unstable left ${unstableLeft}) · Discard ${stage.discardPile.length}</p>
    </section>

    <section class="panel channel-panel${backfirePreview !== null ? " backfire" : ""}">
      <h2>Channel</h2>
      ${channelText(game, backfirePreview ?? stage.channel)}
    </section>

    ${banner}
    <div class="actions">${actions}</div>

    ${logView(game)}`;
}

function view(game: Game, backfirePreview: readonly ChannelCard[] | null): string {
  let body: string;

  if (game.stage === null) {
    body = pickView(game);
  } else if (game.phase === "reward") {
    body = rewardView(game, game.stage);
  } else if (game.phase === "shop") {
    body = shopView(game, game.stage);
  } else {
    body = stageView(game, game.stage, backfirePreview);
  }

  return `
    <main class="game">
      <header>
        <h1>Mage Tower</h1>
        <p class="muted">Text prototype · seed ${game.startSeed}</p>
      </header>
      ${body}
    </main>
  `;
}

export function mountApp(root: HTMLElement): void {
  let backfirePreview: readonly ChannelCard[] | null = null;
  let backfireTimeout: number | null = null;

  const clearBackfirePreview = (): void => {
    if (backfireTimeout !== null) {
      window.clearTimeout(backfireTimeout);
      backfireTimeout = null;
    }

    backfirePreview = null;
  };

  const render = (): void => {
    root.innerHTML = view(getGame(), backfirePreview);

    // keep the newest log lines in view
    const log = root.querySelector<HTMLElement>(".log");

    if (log) {
      log.scrollTop = log.scrollHeight;
    }
  };

  root.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const button = target?.closest<HTMLButtonElement>("button[data-action]");

    if (!button || button.disabled) {
      return;
    }

    switch (button.dataset.action) {
      case "pick":
        pick(button.dataset.id ?? "");
        break;
      case "draw": {
        const game = getGame();
        const stage = game.stage;
        const rules = rulesFor(game);
        const drawnCard = stage?.drawPile[0];
        const drawnChannel =
          stage !== null && drawnCard !== undefined
            ? [...stage.channel, drawnCard]
            : null;
        const failedChannel =
          drawnChannel !== null &&
          stage !== null &&
          canDraw(stage, rules) &&
          isBackfired(drawnChannel, rules)
            ? drawnChannel
            : null;

        draw();

        if (failedChannel !== null) {
          clearBackfirePreview();
          backfirePreview = failedChannel;
          render();
          backfireTimeout = window.setTimeout(() => {
            backfirePreview = null;
            backfireTimeout = null;
            render();
          }, 2000);
        }
        break;
      }
      case "release":
        release();
        break;
      case "reward":
        chooseReward(Number(button.dataset.index));
        break;
      case "skip":
        skipReward();
        break;
      case "buy":
        buy(Number(button.dataset.index));
        break;
      case "cancel":
        cancelPending();
        break;
      case "next":
        nextStage();
        break;
      case "slot":
        selectSlot(Number(button.dataset.slot));
        break;
      case "sell":
        sellCard(Number(button.dataset.slot));
        break;
      case "restart":
        clearBackfirePreview();
        restart();
        break;
    }
  });

  subscribe(render);
  render();
}
