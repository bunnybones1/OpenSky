import { DraftDealerStep } from '../dealerStepTypes'
import { moveRandomItem } from './utils'

export const eventSelectionAccept: DraftDealerStep = state =>
  state.players.items.every(player => {
    if (
      player.currentCardPack &&
      player.currentCardChoice &&
      player.choiceCommited
    ) {
      player.currentCardPack.remove(player.currentCardChoice)
      while (player.currentCardPack.length > 0) {
        moveRandomItem(player.currentCardPack, state.trashCards)
      }
      const event = player.currentCardChoice!
      player.currentCardChoice = undefined
      state.eventsQueue.add(event)
      player.currentCardPack = undefined
    } else {
      throw new Error('not every player made an event selection')
    }
    return true
  })
