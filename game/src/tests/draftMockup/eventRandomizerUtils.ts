import { draftSettings } from './draftSettings'
import DraftState from './DraftState'

const bpp = draftSettings.randomizerBoonsPerPlayer

export function isDistanceInCurrentSlot(
  state: DraftState,
  distance: number,
  slot: number
) {
  const tp = state.players.length
  return (slot - Math.round(distance)) % (tp * bpp) === 0
}
