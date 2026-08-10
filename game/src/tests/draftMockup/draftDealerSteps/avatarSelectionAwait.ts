import { getRandom } from '@opensky/shared/utils/arrayUtils'

import { DraftDealerStep } from '../dealerStepTypes'
import { isFirstPlayer, moveRandomItem } from './utils'

export const avatarSelectionAwait: DraftDealerStep = state => {
  if (state.players.items.some(p => !p.avatar)) {
    for (const player of state.players.items) {
      if (!player.avatar) {
        if (!player.currentCardPack) {
          const pack = getRandom(state.avatarPacks.items)
          state.avatarPacks.remove(pack)
          player.currentCardPack = pack
        } else {
          if (
            !isFirstPlayer(state, player) &&
            !player.currentCardChoice &&
            Math.random() > 0.99
          ) {
            player.currentCardChoice = getRandom(player.currentCardPack.items)
            player.choiceCommited = true
          } else if (player.currentCardChoice && player.choiceCommited) {
            player.choiceCommited = false
            player.currentCardPack.remove(player.currentCardChoice)
            player.avatar = player.currentCardChoice
            state.trashCards.add(player.currentCardChoice)
            player.currentCardChoice = undefined
            while (player.currentCardPack.length > 0) {
              moveRandomItem(player.currentCardPack, state.trashCards)
            }
            player.currentCardPack = undefined
          }
        }
      }
    }
    return false
  } else {
    return true
  }
}
