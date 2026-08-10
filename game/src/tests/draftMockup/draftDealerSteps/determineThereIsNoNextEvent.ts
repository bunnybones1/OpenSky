import { DraftDealerStep } from '../dealerStepTypes'

export const determineThereIsNoNextEvent: DraftDealerStep = state =>
  state.eventsQueue.length === 0
