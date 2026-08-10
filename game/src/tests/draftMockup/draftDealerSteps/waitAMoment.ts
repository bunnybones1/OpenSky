import { DraftDealerStep } from '../dealerStepTypes'

const defaultLastMomentUpdate = -1 * 60 * 60 * 1000
let lastMomentUpdate = defaultLastMomentUpdate
let momentDurationSoFar = 0

export const waitAMoment: DraftDealerStep = () => {
  const now = performance.now()
  const dt = now - lastMomentUpdate
  lastMomentUpdate = now
  if (dt > 5000) {
    return false
  }
  momentDurationSoFar += dt
  if (momentDurationSoFar < 5000) {
    return false
  } else {
    lastMomentUpdate = defaultLastMomentUpdate
    momentDurationSoFar = 0
    return true
  }
}
