import type { DraftDealerStep } from '../dealerStepTypes'
import { draftSettings } from '../draftSettings'
import { makeNewAvatarPack, moveRandomItem } from './utils'

export const ensureAvatarCubeIsPacked: DraftDealerStep = state => {
  if (state.avatarCube.length > 0) {
    if (!state.dealerAvatarPack) {
      state.dealerAvatarPack = makeNewAvatarPack(state)
    }
    if (state.dealerAvatarPack.length < draftSettings.avatarsPerPack) {
      moveRandomItem(state.avatarCube, state.dealerAvatarPack)
    } else {
      state.dealerAvatarPack = makeNewAvatarPack(state)
    }
    return false
  } else {
    return true
  }
}
