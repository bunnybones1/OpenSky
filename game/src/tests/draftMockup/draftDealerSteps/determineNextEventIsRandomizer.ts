import { DraftDealerStep } from '../dealerStepTypes'
import { DraftStateEvent } from '../DraftState'

export const determineNextEventIsRandomizer: DraftDealerStep = state => {
  if (
    state.eventsQueue.length > 0 &&
    (state.eventsQueue.items[0] as DraftStateEvent).eventType === 'randomizer'
  ) {
    const event = state.eventsQueue.items[0]
    state.eventsQueue.remove(event)
    state.currentEvent = event
    return true
  } else {
    return false
  }
}
