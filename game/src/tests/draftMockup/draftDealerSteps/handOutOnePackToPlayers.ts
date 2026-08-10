import { DraftDealerStep } from '../dealerStepTypes'

export const handOutOnePackToPlayers: DraftDealerStep = state => {
  if (
    state.cardPacks.length > 0 &&
    state.players.items.some(p => p.packQueue.length === 0)
  ) {
    const player = state.players.items
      .slice()
      .sort((a, b) => a.packQueue.length - b.packQueue.length)[0]
    const pack = state.cardPacks.items[0]
    state.cardPacks.remove(pack)
    player.packQueue.add(pack)
    return false
  } else {
    return state.players.items.some(p => p.packQueue.length > 0)
  }
}
