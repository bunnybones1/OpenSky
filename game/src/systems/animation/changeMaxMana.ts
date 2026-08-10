import { ResolvedPhaseChangeMaxMana } from '@skyweaver/state-metadata'

import { CardCacheWithEntities } from '~/cardCache'
import { playSound } from '~/helpers/soundHelpers'
import { TabbedLogger } from '~/utils/fancyLogs'

import { ActionStack } from '../AnimationOrchestrator'

export function onEndChangeMaxMana(
  _: CardCacheWithEntities,
  context: ActionStack,
  logger: TabbedLogger | undefined,
  { player, delta }: ResolvedPhaseChangeMaxMana
) {
  if (logger) {
    logger.logStory(`changed player ${player}'s mana by ${delta}`)
  }

  if (delta > 0) {
    playSound('audioFxCommon', 'ManaGain')
  }
}
