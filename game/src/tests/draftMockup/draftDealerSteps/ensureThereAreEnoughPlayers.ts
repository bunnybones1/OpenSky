import { getFakeName } from '~/helpers/fakeNames'

import { DraftDealerStep } from '../dealerStepTypes'
import { draftSettings } from '../draftSettings'
import { DraftStatePlayer } from '../DraftState'

export const ensureThereAreEnoughPlayers: DraftDealerStep = state => {
  if (state.players.length < draftSettings.playerCount) {
    if (Math.random() > 0.4) {
      state.players.add(new DraftStatePlayer(getFakeName()))
    }
    return false
  } else {
    return true
  }
}
