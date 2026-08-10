import { getRandom } from '@opensky/shared/utils/arrayUtils'

import { DraftDealerStep } from '../dealerStepTypes'

export const eventSelectionBegin: DraftDealerStep = state =>
  state.players.items.every(player => {
    if (player.currentCardPack) {
      throw new Error('player already has a pack to choose from')
    }
    if (state.eventPacks.items.length === 0) {
      throw new Error('not enough packs to continue')
    }
    const pack = getRandom(state.eventPacks.items)
    state.eventPacks.remove(pack)
    player.currentCardPack = pack
    return true
  })
