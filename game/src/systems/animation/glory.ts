import { ResolvedPhaseGlory } from '@skyweaver/state-metadata'

import { CardCacheWithEntities } from '~/cardCache'
import { getCardName, TabbedLogger } from '~/utils/fancyLogs'

import { ActionStack } from '../AnimationOrchestrator'

export function onEndGlory(
  _: CardCacheWithEntities,
  __: ActionStack,
  logger: TabbedLogger | undefined,
  [instanceID, damage]: ResolvedPhaseGlory
) {
  if (logger) {
    logger.logStory(
      `${getCardName(instanceID)} was glorious for ${damage} damage`
    )
  }
}
