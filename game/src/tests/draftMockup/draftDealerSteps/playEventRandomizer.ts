import {
  getFromArrayWrapped,
  getRandom,
  removeFromArray,
  shuffleArray
} from '@opensky/shared/utils/arrayUtils'

import { DraftDealerStep } from '../dealerStepTypes'
import { draftSettings } from '../draftSettings'
import { DraftStateBoon, DraftStateCardSlot } from '../DraftState'
import { EventStateRandomizerDealer } from '../EventStateRandomizer'
import { getExampleBoons } from './exampleBoons'
import { waitALongMoment } from './waitALongMoment'

export const playEventRandomizer: DraftDealerStep = state => {
  if (state.dealerEventState instanceof EventStateRandomizerDealer) {
    const eventState = state.dealerEventState
    if (waitALongMoment(state)) {
      for (let i = 0; i < state.players.length; i++) {
        const player = state.players.items[i]
        const boonSlot = getFromArrayWrapped(
          eventState.boonSlots.items,
          Math.round(eventState.distance) +
            i * draftSettings.randomizerBoonsPerPlayer
        )
        if (boonSlot.card) {
          player.boons.add(boonSlot.card)
          boonSlot.card = undefined
        }
      }
      for (const boonSlot of eventState.boonSlots.items) {
        if (boonSlot.card) {
          const boon = boonSlot.card as DraftStateBoon
          boonSlot.card = undefined
          getExampleBoons().push(boon)
          state.trashCards.add(boon)
          state.trashCards.remove(boon)
        }
      }
      state.dealerEventState = undefined
      state.currentEvent = undefined
      return true
    }
  } else {
    if (!state.dealerEventState) {
      const eventState = new EventStateRandomizerDealer()
      const total =
        state.players.length * draftSettings.randomizerBoonsPerPlayer
      const boons = getExampleBoons()
      shuffleArray(boons)
      while (eventState.boonSlots.length < total) {
        if (boons.length === 0) {
          throw new Error('no more boons in boon library')
        }
        const boon = getRandom(boons)
        removeFromArray(boons, boon)
        eventState.boonSlots.add(new DraftStateCardSlot(boon))
      }
      state.dealerEventState = eventState
      return false
    }
    return false
  }
  return false
}
