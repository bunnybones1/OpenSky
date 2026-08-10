import { DraftDealerStep } from '../dealerStepTypes'
import { moveRandomItem } from './utils'

export const avatarSelectionAccept: DraftDealerStep = state =>
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
      const avatar = player.currentCardChoice
      player.currentCardChoice = undefined
      player.currentCardPack = undefined
      player.avatar = avatar
      state.trashCards.add(avatar)
    } else {
      throw new Error('not every player made an avatar selection')
    }
    return true
  })
