import { FindByType } from '@opensky/shared/typeHelpers'
import { Player, PlayerAction } from '@skyweaver/state-metadata'

import { getCardName, TabbedLogger } from '~/utils/fancyLogs'

export function onStartPlayCard(
  logger: TabbedLogger | undefined,
  player: Player,
  action: FindByType<PlayerAction, 'PlayCard'>
) {
  if (logger) {
    logger.logStory(`playing card ${getCardName(action.cardID)}`)
    logger.logStory(`playing card player ${player}`)
    logger.logStory(`playing card id ${action.cardID}`)
    logger.logStory(`playing card target ${action.targetID}`)
  }
}

export function onEndPlayCard(
  logger: TabbedLogger | undefined,
  player: Player,
  action: FindByType<PlayerAction, 'PlayCard'>
) {
  if (logger) {
    logger.logStory(`playing card ${getCardName(action.cardID)}`)
    logger.logStory(`played card player ${player}`)
    logger.logStory(`played card id ${action.cardID}`)
    logger.logStory(`played card target ${action.targetID}`)
  }
}
