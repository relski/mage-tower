import type { ChannelCard } from "../core/types";

const NUMBER_VALUES = [1, 2, 3, 4, 5, 6, 7];
const COPIES_PER_VALUE = 2;
const UNSTABLE_COUNT   = 6;

export function createStartingDeck(): ChannelCard[] {
   const deck: ChannelCard[] = [];

   for (const value of NUMBER_VALUES) {
      for (let i = 0; i < COPIES_PER_VALUE; i++) {
         deck.push({ kind: "number", value });
      }
   }

   for (let i = 0; i < UNSTABLE_COUNT; i++) {
      deck.push({ kind: "unstable" });
   }

   return deck;
}