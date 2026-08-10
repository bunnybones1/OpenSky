import { DraftDealerStep } from '../dealerStepTypes'

export const handOutPacksToPlayers: DraftDealerStep = state => {
  if (state.cardPacks.length > 0) {
    const pack = state.cardPacks.items[0]
    state.cardPacks.remove(pack)
    const player = state.players.items
      .slice()
      .sort((a, b) => a.packQueue.length - b.packQueue.length)[0]
    player.packQueue.add(pack)
    return false
  } else {
    return true
  }
}
