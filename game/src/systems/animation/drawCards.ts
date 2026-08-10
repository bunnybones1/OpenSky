import { PhaseDraw, ResolvedPhaseDraw } from '@skyweaver/state-metadata'

import { CardCacheWithEntities } from '~/cardCache'
import { TabbedLogger } from '~/utils/fancyLogs'

import { ActionStack } from '../AnimationOrchestrator'

function _onStartDrawCards(
  cardCache: CardCacheWithEntities,
  context: ActionStack,
  logger: TabbedLogger | undefined,
  payload: PhaseDraw
) {
  if (logger) {
    logger.logStory(`drawing card from ${payload.from} to ${payload.to}`)
  }
}

export function onEndDrawCards(
  cardCache: CardCacheWithEntities,
  context: ActionStack,
  logger: TabbedLogger | undefined,
  payload: ResolvedPhaseDraw
) {
  if (logger) {
    logger.logStory(
      `drew card ${JSON.stringify(payload.drawnCard)} from ${payload.from} to ${
        payload.to
      }`
    )
  }
}
