import { getRandom } from '@opensky/shared/utils/arrayUtils'

import { DraftDealerStep } from '../dealerStepTypes'

export const avatarSelectionBegin: DraftDealerStep = state =>
  state.players.items.every(player => {
    if (player.currentCardPack) {
      throw new Error('player already has a pack to choose from')
    }
    if (state.avatarPacks.items.length === 0) {
      throw new Error('not enough packs to continue')
    }
    const pack = getRandom(state.avatarPacks.items)
    state.avatarPacks.remove(pack)
    player.currentCardPack = pack
    return true
  })
