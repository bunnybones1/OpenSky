import { getRandom } from '@opensky/shared/utils/arrayUtils'

import { DraftDealerStep } from '../dealerStepTypes'
import { isFirstPlayer, moveRandomItem } from './utils'

export const eventSelectionAwaitAndAccept: DraftDealerStep = state =>
  state.players.items.every(player => {
    if (!player.currentCardPack) {
      throw new Error('player doesnt have a card pack to choose from')
    }
    if (!player.currentCardChoice || !player.choiceCommited) {
      if (
        !isFirstPlayer(state, player) &&
        !player.currentCardChoice &&
        Math.random() > 0.99
      ) {
        player.currentCardChoice = getRandom(player.currentCardPack.items)
        player.choiceCommited = true
      }
      return false
    } else {
      player.currentCardPack.remove(player.currentCardChoice)
      while (player.currentCardPack.length > 0) {
        moveRandomItem(player.currentCardPack, state.trashCards)
      }
      const avatar = player.currentCardChoice
      player.currentCardChoice = undefined
      player.currentCardPack = undefined
      player.avatar = avatar
      state.trashCards.add(avatar)
      player.choiceCommited = false
      return true
    }
  })
