import { isDevMode } from '@opensky/shared/devMode'
import { getUrlFlag } from '@opensky/shared/utils/location'
import {
  isCharacter,
  isHeroAbility,
  PhaseResolveCardEffect,
  ResolvedPhaseResolveCardEffect
} from '@skyweaver/state-metadata'

import { CardCacheWithEntities } from '~/cardCache'
import { shineBannerFrom } from '~/helpers/effectHelpers'
import { pulseEntityScale } from '~/helpers/pulseEntityScale'
import { playSound } from '~/helpers/soundHelpers'
import { scene } from '~/scenes/arena/scene'
import { animationDelay } from '~/utils/asyncUtils'
import { getCardName, TabbedLogger } from '~/utils/fancyLogs'

import { ActionStack } from '../AnimationOrchestrator'
import { buildOnStartResolvingCardEffectMSA } from './meshAnimationBuilders'
import { meshAnimationPlayer } from './meshAnimationPlayer'
import { pulseEntityActivating } from './pulseEntityActivating'

export async function onStartResolvingCardEffect(
  cardCache: CardCacheWithEntities,
  context: ActionStack,
  logger: TabbedLogger | undefined,
  payload: PhaseResolveCardEffect
) {
  const entity = cardCache.getEntity(payload.id)
  if (!entity) {
    return
  }
  if (logger) {
    logger.logStory(
      `resolving effects of ${getCardName(payload.id)} ${
        payload.targetId ? `Targeting ${getCardName(payload.targetId)}` : ''
      }`
    )
  }

  const card = entity.has('cardInstance') && entity.get('cardInstance')

  if (!card) {
    console.error(
      'Failed to resolve card effect for hidden card ',
      entity.get('zone').current.cardStatus,
      entity.has('order') && entity.get('order')
    )
    return
  }

  const targetID =
    context.playerAction[1].type === 'PlayCard'
      ? context.playerAction[1].targetID
      : undefined
  const targetEntity = cardCache.getEntity(targetID)

  if (getUrlFlag('logMSA') && isDevMode()) {
    console.log(
      '===========================LOG FROM onStartResolvingCardEffect ================================='
    )
    console.log(`
card.base: ${card.base}
playerActionType: ${context.playerAction[1].type}
parentPhase: ${context.parentPhase}
parentPhaseType: ${context.parentPhase?.type}
topPhase: ${context.topPhase}
topPhaseType: ${context.topPhase?.type}
ppPayload: ${
      context.parentPhase &&
      typeof context.parentPhase.payload === 'object' &&
      'baseCard' in context.parentPhase.payload &&
      context.parentPhase.payload.baseCard
    }
tpPayload: ${
      context.topPhase &&
      typeof context.topPhase.payload === 'object' &&
      'baseCard' in context.topPhase.payload &&
      context.topPhase.payload.baseCard
    }
  `)
  }

  meshAnimationPlayer({ ID: 'cardCasting', entity, context, cardCache })
  meshAnimationPlayer({ ID: 'borderGlint', entity })
  meshAnimationPlayer({ ID: 'heroAbilityTrigger', entity, context, cardCache })

  await meshAnimationPlayer({
    ID: payload.baseCard,
    entity,
    context,
    cardCache,
    targetEntity,
    payload
  })

  await buildOnStartResolvingCardEffectMSA(
    card,
    entity,
    cardCache,
    targetEntity
  )

  if (!isCharacter(card) && card.state.view.traits.includes('banner')) {
    if (entity.has('isAnimating')) {
      await entity.get('isAnimating').finishedFull
    }
    playSound('audioFxCommon', 'TraitBannerGain')
    shineBannerFrom(entity, scene)
    await animationDelay(entity.has('player') ? 750 : 1500)
  }
  if (isHeroAbility(card)) {
    pulseEntityActivating(entity)
    pulseEntityScale(entity)
  }
}

export function onEndResolvingCardEffect(
  _: CardCacheWithEntities,
  __: ActionStack,
  logger: TabbedLogger | undefined,
  payload: ResolvedPhaseResolveCardEffect
) {
  if (logger) {
    logger.logStory(
      `resolved effects of ${getCardName(payload.id)} ${
        payload.targetId ? `Targeting ${getCardName(payload.targetId)}` : ''
      }`
    )
  }
}
