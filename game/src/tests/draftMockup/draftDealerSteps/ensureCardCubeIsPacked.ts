import { shuffleArray } from '@opensky/shared/utils/arrayUtils'

import { DraftDealerStep } from '../dealerStepTypes'
import { draftSettings } from '../draftSettings'
import { makeNewCardPack, moveRandomCard } from './utils'

export const ensureCardCubeIsPacked: DraftDealerStep = state => {
  if (state.cardCube.length > 0) {
    if (!state.dealerCardPack) {
      state.dealerCardPack = makeNewCardPack(state)
    }
    if (state.dealerCardPack.length < draftSettings.cardsPerPack) {
      if (
        state.dealerCardPack.items.filter(c => c.rarity === 'gold').length <
        draftSettings.goldsPerCardPack
      ) {
        moveRandomCard(state.cardCube, state.dealerCardPack, 'gold')
      }
      if (
        state.dealerCardPack.items.filter(c => c.rarity === 'silver').length <
        draftSettings.silversPerCardPack
      ) {
        moveRandomCard(state.cardCube, state.dealerCardPack, 'silver')
      } else {
        moveRandomCard(state.cardCube, state.dealerCardPack, 'base')
      }
    } else {
      shuffleArray(state.dealerCardPack.items)
      state.dealerCardPack = makeNewCardPack(state)
    }
    return false
  } else {
    return true
  }
}
