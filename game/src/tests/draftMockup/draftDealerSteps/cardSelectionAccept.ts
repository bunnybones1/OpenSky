import { getPrev, getRandom } from '@opensky/shared/utils/arrayUtils'

import { DraftDealerStep } from '../dealerStepTypes'
import { isFirstPlayer } from './utils'

export const cardSelectionAccept: DraftDealerStep = state => {
  if (
    state.players.items.some(p => p.packQueue.length > 0 || p.currentCardPack)
  ) {
    for (const player of state.players.items) {
      if (player.currentCardPack === undefined && player.packQueue.length) {
        const pack = player.packQueue.items[0]
        player.packQueue.remove(pack)
        player.currentCardPack = pack
      }
      if (player.currentCardPack) {
        if (player.choiceCommited && !player.currentCardChoice) {
          player.choiceCommited = false
        }
        if (player.currentCardChoice && player.choiceCommited) {
          player.choiceCommited = false
          if (player.currentCardPack.items.includes(player.currentCardChoice)) {
            player.deck.add(player.currentCardChoice)
            player.currentCardPack.remove(player.currentCardChoice)
            player.currentCardChoice = undefined
            const pack = player.currentCardPack
            player.currentCardPack = undefined
            const nextPlayer = getPrev(state.players.items, player)
            if (pack.length > 0) {
              nextPlayer.packQueue.add(pack)
            }
          }
        } else if (!isFirstPlayer(state, player) && Math.random() > 0.975) {
          player.currentCardChoice = getRandom(player.currentCardPack.items)
          player.choiceCommited = true
        }
      }
    }
    return false
  } else {
    return true
  }
}
