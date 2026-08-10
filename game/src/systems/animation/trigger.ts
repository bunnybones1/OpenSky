import { isDevMode } from '@opensky/shared/devMode'
import { getUrlFlag } from '@opensky/shared/utils/location'
import {
  BaseCard,
  EffectType,
  InstanceID,
  Phase,
  PhaseResolveTrigger,
  ResolvedPhaseResolveTrigger
} from '@skyweaver/state-metadata'

import { CardCacheWithEntities } from '~/cardCache'
import { pulseEntityOutline } from '~/helpers/pulseEntityOutline'
import { pulseEntityScale } from '~/helpers/pulseEntityScale'
import { playSound } from '~/helpers/soundHelpers'
import { animationDelay } from '~/utils/asyncUtils'
import { TabbedLogger } from '~/utils/fancyLogs'

import { ActionStack } from '../AnimationOrchestrator'
import {
  maybeEndAttributionTracker,
  maybeStartAttributionTracker
} from './attributionTracker'
import { createTriggerAnimation } from './createTriggerAnimation'
import { buildTriggerMSA } from './meshAnimationBuilders'
import { meshAnimationLibrary } from './meshAnimationLibrary'
import { meshAnimationPlayer } from './meshAnimationPlayer'
import { MeshAnimationEventName } from './meshAnimationTypes'

export async function onStartResolveTrigger(
  cardCache: CardCacheWithEntities,
  context: ActionStack,
  logger: TabbedLogger | undefined,
  payload: PhaseResolveTrigger
) {
  if (logger) {
    logger.logStory(`triggering`)
  }
  await maybeStartAttributionTracker(
    'trigger',
    cardCache,
    context,
    payload,
    true
  )
  let baseCard
  if (typeof payload.effect == 'object' && 'Intrinsic' in payload.effect) {
    baseCard = payload.effect.Intrinsic
  } else {
    switch (payload.effect) {
      case 'Dazed':
        baseCard = '20032' as BaseCard
        break
      case 'Shroud':
        baseCard = '20042' as BaseCard
        break
      case 'Fate':
        baseCard = '20049' as BaseCard
        break
      case 'Flames':
        baseCard = '20023' as BaseCard
        break
      case 'Fury':
        baseCard = '20051' as BaseCard
        break
    }
  }
  if (baseCard) {
    const isHeroTriggering = baseCard === 'Hero'
    if (isHeroTriggering) {
      return
    }
    if (payload.effectType === 'Glory') {
      animationDelay(200).then(() => {
        playSound('audioFxCommon', 'GloryTriggers')
      })
    } else {
      playSound('audioFxCommon', 'Trigger')
    }
    const entity = cardCache.getEntity(payload.id)

    if (
      entity &&
      entity.has('cardInstance') &&
      entity.has('zone') &&
      !entity.has('heroAbility') &&
      // Disable Minstrel's animation for opponent (to prevent from visually leaking card info)
      !(
        entity.get('cardInstance').base === '2082' /* Minstrel */ &&
        entity.get('zone').owner === 'Opponent'
      )
    ) {
      let cardID = entity.get('cardInstance').base

      if (getUrlFlag('logMSA') && isDevMode()) {
        console.log(
          '===========================LOG FROM onStartResolveTrigger ================================='
        )
        console.log(`
    card.base: ${cardID}
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
    triggerSource: ${context.triggerSource}
      `)
      }

      buildTriggerMSA(entity, payload)

      await createTriggerAnimation(entity, 'trigger')

      meshAnimationPlayer({
        ID: 'heroAbilityTrigger',
        entity,
        context,
        cardCache
      })

      for (const type of ['Slay', 'Glory', 'Death']) {
        if (payload.effectType === type) {
          meshAnimationPlayer({
            ID: `${type.toLowerCase()}Trigger` as MeshAnimationEventName,
            entity,
            context,
            payload
          })
        }
      }

      if (
        payload.effect === 'Flames' ||
        payload.effect === 'Dazed' ||
        payload.effect === 'Shroud'
      ) {
        cardID = entity.get('hostingAttachment').entity.get('cardInstance').base
      }

      if (meshAnimationLibrary.has(cardID)) {
        meshAnimationPlayer({
          ID: cardID,
          entity,
          context,
          cardCache,
          payload
        })
      } else if (
        payload.effectType === 'Inspire' ||
        payload.effectType === 'Generic' ||
        payload.effectType === 'Sunrise' ||
        payload.effectType === 'Sunset'
      ) {
        meshAnimationPlayer({
          ID: 'genericElementBasedTrigger',
          entity,
          context,
          cardCache,
          payload
        })
      }
    }
  }
}

export async function onEndResolveTrigger(
  cardCache: CardCacheWithEntities,
  context: ActionStack,
  logger: TabbedLogger | undefined,
  payload: ResolvedPhaseResolveTrigger
) {
  if (logger) {
    logger.logStory(`triggered`)
  }
  await maybeEndAttributionTracker('trigger', cardCache, context, payload, true)

  const entity = cardCache.getEntity(payload.id)

  if (entity && entity.has('cardInstance') && entity.has('heroAbility')) {
    buildTriggerMSA(entity, payload)

    if (
      entity.has('cardInstance') &&
      entity.get('cardInstance').base !== '25010' /* Mai - Gadgeteer */
    ) {
      pulseEntityScale(entity)
    }

    pulseEntityOutline(entity)
    await createTriggerAnimation(entity, 'trigger')
  }
}

export async function onPhaseModified(
  cardCache: CardCacheWithEntities,
  _context: ActionStack,
  logger: TabbedLogger | undefined,
  {
    source,
    effect_type
  }: { old: Phase; new: Phase; source: InstanceID; effect_type: EffectType }
) {
  if (effect_type === 'Internal') {
    return
  }
  if (logger) {
    logger.logStory(`triggering phase modified animation`)
  }
  playSound('audioFxCommon', 'Trigger')
  const entity = cardCache.getEntity(source)
  if (entity && entity.has('cardInstance')) {
    const cardID = entity.get('cardInstance').base

    meshAnimationPlayer({ ID: cardID, entity, cardCache, type: 'aura' })

    await createTriggerAnimation(
      entity,
      effect_type === 'Continuous' ? 'aura' : 'trigger'
    )
  }
}
