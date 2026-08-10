import { getRandom } from '@opensky/shared/utils/arrayUtils'

import { DraftDealerStep } from '../dealerStepTypes'
import { isFirstPlayer } from './utils'

export const genericSelectionAwait: DraftDealerStep = state =>
  state.players.items.every(player => {
    if (player.currentCardChoice && player.choiceCommited) {
      return true
    }
    if (player.currentCardPack) {
      if (
        !isFirstPlayer(state, player) &&
        !player.currentCardChoice &&
        Math.random() > 0.9
      ) {
        player.currentCardChoice = getRandom(player.currentCardPack.items)
        player.choiceCommited = true
        return true
      }
      return false
    } else {
      throw new Error('player doesnt have a card pack to choose from')
    }
  })
