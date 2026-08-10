import { ResolvedPhaseChangeMana } from '@skyweaver/state-metadata'

import { CardCacheWithEntities } from '~/cardCache'
import { playSound } from '~/helpers/soundHelpers'
import { store } from '~/state'
import { matchInfoStore } from '~/state/stores/MatchInfoStore'
import { TabbedLogger } from '~/utils/fancyLogs'

import { ActionStack } from '../AnimationOrchestrator'

export function onEndChangeMana(
  _: CardCacheWithEntities,
  context: ActionStack,
  logger: TabbedLogger | undefined,
  { player, delta }: ResolvedPhaseChangeMana
) {
  if (context.topPhase?.type === 'StartTurn') {
    return
  }

  if (logger) {
    logger.logStory(`changed player ${player}'s mana by ${delta}`)
  }

  if (delta > 0) {
    playSound('audioFxCommon', 'ManaGain')
  }

  switch (store.player) {
    case player:
      matchInfoStore.playerInfo.manaChangeDispatcher.dispatch(delta)
      break
    case 1 - player:
      matchInfoStore.opponentInfo.manaChangeDispatcher.dispatch(delta)
      break
  }
}
