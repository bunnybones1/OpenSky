import { ResolvedPhaseEndTurn } from '@skyweaver/state-metadata'

import { CardCacheWithEntities } from '~/cardCache'
import {
  getTimeInDays,
  onNextTimeOfDay
} from '~/controllers/skyTimerController'
import { resetOrderedSoundVariation } from '~/helpers/soundHelpers'
import { matchInfoStore } from '~/state/stores/MatchInfoStore'
import { TabbedLogger } from '~/utils/fancyLogs'

import { ActionStack } from '../AnimationOrchestrator'
import { onAnimationsFinished } from '../onAnimationsFinished'

export async function onEndEndTurn(
  cardCache: CardCacheWithEntities,
  __: ActionStack,
  logger: TabbedLogger | undefined,
  phase: ResolvedPhaseEndTurn
) {
  const turn = phase.turnCount
  matchInfoStore.turnCount = turn
  const p = onNextTimeOfDay(
    `end of turn ${turn} (${phase.player ? 'player' : 'opponent'})`,
    getTimeInDays(turn, 0.95)
  )
  await p
  matchInfoStore.pauseSky = true

  if (logger) {
    const isMyTurn = phase.player === cardCache.owner
    logger.logStory(`turn ended for ${isMyTurn ? 'player' : 'opponent'}`)
  }

  onAnimationsFinished(turn)
  // so if you play 3 units, then end, and your oppt does, we restart the sounds at 0
  resetOrderedSoundVariation('audioFxCommonVariations', 'Summon')
  resetOrderedSoundVariation('audioFxCommonVariations', 'SummonSilver')
  resetOrderedSoundVariation('audioFxCommonVariations', 'SummonGold')
  resetOrderedSoundVariation('audioFxCommonVariations', 'CardDeath')
}
