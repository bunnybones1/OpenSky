import { ResolvedPhaseConjure } from '@skyweaver/state-metadata'

import { CardCacheWithEntities } from '~/cardCache'
import { getCardName, TabbedLogger } from '~/utils/fancyLogs'

import { ActionStack } from '../AnimationOrchestrator'
import {
  maybeEndAttributionTracker,
  maybeStartAttributionTracker
} from './attributionTracker'

export function onStartConjure(
  cardCache: CardCacheWithEntities,
  context: ActionStack,
  logger: TabbedLogger | undefined
  // payload: PhaseConjure
) {
  if (logger) {
    logger.logStory(`conjuring something...`)
  }
}

export async function onEndConjure(
  cardCache: CardCacheWithEntities,
  context: ActionStack,
  logger: TabbedLogger | undefined,
  payload: ResolvedPhaseConjure
) {
  if (logger) {
    logger.logStory(`conjured ${getCardName(payload.conjuredCard)}`)
  }
  await maybeStartAttributionTracker(
    'conjure',
    cardCache,
    context,
    payload.conjuredCard
  )
  await maybeEndAttributionTracker(
    'conjure',
    cardCache,
    context,
    payload.conjuredCard
  )
}
