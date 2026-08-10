import { BaseCard, Rarity } from "@skyweaver/state-metadata";

export type GameEngineController = {
  getCanvas: () => HTMLCanvasElement
  startTrackingCanvasSize: () => void
  pause: () => void
  resume: () => void
  listenForCardChange:(cb:(id:BaseCard, rarity:Rarity)=>void) => void
  showCard: (id:BaseCard, rarity:Rarity) => void
}