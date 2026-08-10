import { CardCacheWithEntities } from '~/cardCache'
import { playSound } from '~/helpers/soundHelpers'
import { TabbedLogger } from '~/utils/fancyLogs'

import { ActionStack } from '../AnimationOrchestrator'

export function onStartMulligan(
  _: CardCacheWithEntities,
  __: ActionStack,
  logger: TabbedLogger | undefined
) {
  if (logger) {
    logger.logStory(`mulligan cards...`)
  }

  playSound('audioFxCommon', 'CardMulligan')
}
