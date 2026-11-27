import { channelMultiplier, channelPower, unstableCount } from "../../core/channel";
import type { ChannelCard, StageState } from "../../core/types";
import { MAX_CHANNEL_SIZE } from "../../data/tuning";
import { rulesFor } from "../../state/game";
import type { Game } from "../../state/game";
import { icon } from "../icons";

// one of the fixed card slots: an empty outline, or the drawn card. Number cards are colored
// boxes with their value; an Unstable card is a neutral box with a warning icon.
function slotBox(card: ChannelCard | undefined): string {
  if (card === undefined) {
    return `<div class="channel-slot empty" aria-hidden="true"></div>`;
  }

  const content =
    card.kind === "unstable"
      ? `${icon("unstable")}<span class="sr-only">Unstable</span>`
      : String(card.value);

  return `<div class="channel-slot ${card.kind}" role="listitem">${content}</div>`;
}

// The channel panel. Top line: the draw pile (with how many Unstable cards are still in it) and
// the discard pile on the left, the casts left on the right. Then the five fixed card slots,
// and a line with the power, the multiplier and the Unstable count against the limit.
// While a failed cast is on screen it shows that channel, in a red panel.
export function channelPanel(
  game: Game,
  stage: StageState,
  backfirePreview: readonly ChannelCard[] | null,
): string {
  const channel = backfirePreview ?? stage.channel;
  const rules = rulesFor(game);
  const unstableLeft = unstableCount(stage.drawPile);

  const slots = Array.from({ length: MAX_CHANNEL_SIZE }, (_, index) => slotBox(channel[index])).join("");

  const stats =
    channel.length === 0
      ? `<p class="channel-stats muted">Draw cards to build a channel.</p>`
      : `<p class="channel-stats">Power ${channelPower(channel, rules)} × ${channelMultiplier(channel.length, rules)} · Unstable ${unstableCount(channel)}/${rules.unstableLimit}</p>`;

  return `
    <section class="panel channel-panel${backfirePreview !== null ? " backfire" : ""}">
      <div class="channel-head">
        <span>Pile ${stage.drawPile.length} (${icon("unstable")}<span class="sr-only">Unstable cards left </span>${unstableLeft}) · Discard ${stage.discardPile.length}</span>
        <span>Casts<span class="sr-only"> left</span> ${stage.castsRemaining}</span>
      </div>
      <div class="channel-slots" style="--slots: ${MAX_CHANNEL_SIZE}" role="list" aria-label="Drawn channel cards">${slots}</div>
      ${stats}
    </section>`;
}
