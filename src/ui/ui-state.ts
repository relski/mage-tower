import type { ChannelCard } from "../core/types";
import type { TabName } from "./components/tab-section";
import type { ShopTab } from "./screens/shop-screen";

// what the enemy picture shows over itself while a cast plays
export type CastView = {
  total: number, // the big number: the running damage total
  text: string, // what just changed it, for example "Fire: +20 damage"
  hit: boolean, // the enemy has been hit: shake it
};

// UI-only state: what the screens need besides the Game. None of it is saved.
export type UiState = {
  backfirePreview: readonly ChannelCard[] | null, // the failed channel, shown for a moment
  cast: CastView | null, // set while a cast animation plays
  menuOpen: boolean, // the player panel's menu
  activeTab: TabName, // the selected tab of the stage screen
  shopTab: ShopTab, // the selected tab of the shop
  confirmReward: number | null, // index of the card reward waiting for a Yes or No
};

// While a failed cast or a cast animation is on screen, the stage cannot be played:
// Draw, Release and the loadout slots are off.
export function isLocked(ui: UiState): boolean {
  return ui.backfirePreview !== null || ui.cast !== null;
}
