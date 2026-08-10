import { DraftDealerStep } from '../dealerStepTypes'
import { draftSettings } from '../draftSettings'
import { makeNewEventPack, moveRandomItem } from './utils'

export const ensureEventCubeIsPacked: DraftDealerStep = state => {
  if (state.eventCube.length > 0) {
    if (!state.dealerEventPack) {
      state.dealerEventPack = makeNewEventPack(state)
    }
    if (state.dealerEventPack.length < draftSettings.avatarsPerPack) {
      moveRandomItem(state.eventCube, state.dealerEventPack)
    } else {
      state.dealerEventPack = makeNewEventPack(state)
    }
    return false
  } else {
    return true
  }
}
