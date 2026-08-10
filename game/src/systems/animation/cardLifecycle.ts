import { FindByType } from '@opensky/shared/typeHelpers'
import { CardEvent, CardInstance, SkyWeaver } from '@skyweaver/state-metadata'
import { Entity } from 'gg'

import { CardCacheWithEntities } from '~/cardCache'
import { Components } from '~/components'
import AttachedToComponent from '~/components/AttachedToComponent'
import CardInstanceComponent from '~/components/CardInstanceComponent'
import HeroAbilityComponent from '~/components/HeroAbilityComponent'
import HeroAbilitySilencedComponent from '~/components/HeroAbilitySilencedComponent'
import IsRevealedComponent from '~/components/IsRevealedComponent'
import OverkillComponent from '~/components/OverkillComponent'
import PlayerComponent from '~/components/PlayerComponent'
import SleepingComponent from '~/components/SleepingComponent'
import SpecialConjureComponent from '~/components/SpecialConjureComponent'
import { traitToComponentsMap } from '~/components/TraitComponents'
import TriggersHolderComponent from '~/components/TriggersHolderComponent'
import { SHOULD_LOG_ACTION } from '~/constants'
import { createCard } from '~/factories/CardFactory'
import { playSound } from '~/helpers/soundHelpers'
import { traitBadgeOrder } from '~/helpers/typeHelpers'
import { removeWorldEntity } from '~/helpers/worldHelpers'
import { getCardAtlasKey, getCharacterAtlasKey } from '~/materials'
import queryParams from '~/queryParams'
import { store } from '~/state'
import { animationDelay } from '~/utils/asyncUtils'
import {
  getCardInstanceName,
  getCardName,
  TabbedLogger
} from '~/utils/fancyLogs'
import { clearInteractivesForCard } from '~/utils/helpers/InteractivesHelpers'

import { ActionStack } from '../AnimationOrchestrator'
import {
  buildBaseChangeMSA,
  buildBigHeroDeathMSA,
  buildSmallHeroDeathMSA
} from './meshAnimationBuilders'

const __rarityOverride =
  queryParams.rarityOverride === 'gold' ||
  queryParams.rarityOverride === 'silver'
    ? queryParams.rarityOverride
    : undefined
const __heroAbilitiesThatShouldLookLikeNormalCardsInChooseZone = [
  '25024',
  '25025'
]

export function onCardMoved(
  cardCache: CardCacheWithEntities,
  context: ActionStack,
  logger: TabbedLogger | undefined,
  payload: FindByType<CardEvent<SkyWeaver>, 'MoveCard'>['payload']
) {
  const { to: location } = payload
  const instance = payload.instance?.[0]
  const attachment = payload.instance?.[1]
  const isToPublic = cardCache.isZonePublic(location.location?.[0]) || false
  const isPlayer = location.player === store.player

  const isAttachingDestination =
    location.location[0].name === 'Attachment' && location.location[0].parent
  if (isAttachingDestination && !cardCache.getEntity(isAttachingDestination)) {
    // we're an attachment attaching to an entity that does not yet exist, probably because it's in limbo
    return
  }

  let entity = cardCache.getEntity(location)

  const destinationIsPublicOrOurSecret =
    cardCache.isDestinationPublicOrOurSecret(location)

  if (!entity) {
    if (location.location[0].name === 'Dust') {
      // going from nowhere to dust, bail
      return
    }
    entity = createCard(instance, isPlayer)
    cardCache.setEntity(location, entity)
  }

  let attachmentEntity = entity.has('hostingAttachment')
    ? entity.get('hostingAttachment').entity
    : undefined
  if (attachment) {
    if (
      instance &&
      (!attachmentEntity ||
        (attachmentEntity.has('cardInstance') &&
          attachmentEntity.get('cardInstance').id !== attachment.id)) &&
      location.location[0].name !== 'Dust' &&
      destinationIsPublicOrOurSecret
    ) {
      attachmentEntity = createCard(attachment, isPlayer)
      cardCache.setEntity(
        {
          ...location,
          location: [{ name: 'Attachment', parent: { id: instance.id } }, 0]
        },
        attachmentEntity
      )
    }
    if (attachmentEntity) {
      if (entity && !attachmentEntity.has('attachedTo')) {
        attachmentEntity.add(new AttachedToComponent(entity))
      }
      attachmentEntity.get('zone').setOwner(isPlayer ? 'Player' : 'Opponent')
      attachmentEntity.get('zone').setStateZone('Attachment')
      attachmentEntity.toggleComponent(IsRevealedComponent, isToPublic)
    }
  } else {
    if (attachmentEntity) {
      cardCache.removeEntity(attachmentEntity)
      removeWorldEntity(attachmentEntity.id)
    }
  }
  entity.toggleComponent(IsRevealedComponent, isToPublic)

  if (destinationIsPublicOrOurSecret && instance) {
    const cachedInstance = cardCache.getInstance(instance)
    if (!cachedInstance) {
      throw new Error('Expected cached instance!')
    }

    if (!entity.has('cardInstance')) {
      entity.add(new CardInstanceComponent(cachedInstance))
    }

    onCardUpdated(cardCache, context, logger, cachedInstance, entity)

    if (attachment) {
      const cachedAttachment = cardCache.getInstance(attachment)
      if (!cachedAttachment) {
        throw new Error('Expected cached attachment!')
      }

      attachmentEntity = cardCache.getEntity({
        ...location,
        location: [{ name: 'Attachment', parent: { id: instance.id } }, 0]
      })
      if (attachmentEntity) {
        if (!attachmentEntity.has('cardInstance')) {
          attachmentEntity.add(new CardInstanceComponent(cachedAttachment))
        }
        onCardUpdated(
          cardCache,
          context,
          logger,
          cachedAttachment,
          attachmentEntity
        )
      }
    }
  }

  if (!destinationIsPublicOrOurSecret) {
    if (attachmentEntity) {
      cardCache.removeEntity(attachmentEntity)
      removeWorldEntity(attachmentEntity.id)
    }
    entity.remove('cardInstance')
    entity.set('frameStyle', 'base')
  }

  if (
    cardCache.getInstance(context.triggerSource?.id)?.base ===
      '4132' /* Reef Diver  */ &&
    location.location[0].name === 'Dust'
  ) {
    entity.toggle(SpecialConjureComponent, true)
  }

  // is this an instance we've never seen before?
  if (instance && !cardCache.has(instance.id)) {
    if (logger && SHOULD_LOG_ACTION) {
      if (attachment) {
        logger.log(
          `instantiating ${getCardInstanceName(instance)} (${
            instance.base
          }) with attachment ${getCardInstanceName(attachment)} (${
            attachment.base
          }) at ${JSON.stringify(location)}`
        )
      } else {
        logger.log(
          `instantiating ${getCardInstanceName(instance)} (${
            instance.base
          }) at ${JSON.stringify(location)}`
        )
      }
    }

    // Don't play movement noises at the beginning of the game
    if (context.playerAction && context.playerAction[1].type !== 'Setup') {
      playSound('audioFxCommon', 'CardFlies')
    }

    const phase = context.topPhase
    if (phase && phase.type === 'Draw') {
      playSound('audioFxCommon', 'CardDraw')
    }
  }
}

//TODO ATTRIBUTION
export function onCardUpdated(
  cardCache: CardCacheWithEntities,
  context: ActionStack,
  logger: TabbedLogger | undefined,
  instance: CardInstance<SkyWeaver>,
  entity: Entity<Components>,
  healthBeforeEvent?: number
) {
  if (logger && SHOULD_LOG_ACTION) {
    logger.log(`updating card ${getCardName(instance.id)}`)
  }
  const cachedInstance = cardCache.getInstance(instance)
  const isMarkedForDeath =
    context.topPhase?.type === 'ModifyCard' &&
    typeof context.topPhase.payload.modifier === 'object' &&
    healthBeforeEvent
      ? 'ModifyHealth' in context.topPhase.payload.modifier
        ? healthBeforeEvent +
            context.topPhase.payload.modifier.ModifyHealth[0] <=
          0
        : false
      : false
  const cachedAttachment = cachedInstance?.attachment
    ? cardCache.getInstance(instance)
    : null
  if (!cachedInstance) {
    throw new Error('Expected cached instance for entity!')
  }
  if (cachedInstance.attachment && !cachedAttachment) {
    throw new Error('Expected cached instance for attachment!')
  }

  const isCharacter = entity.has('character')
  const isHero = entity.has('hero')
  const hasMesh = entity.has('mesh')
  const zone = entity.has('zone') ? entity.get('zone').stateZone : undefined
  const owner = entity.has('zone') ? entity.get('zone').owner : undefined
  const oldArtKey = hasMesh ? entity.get('mesh').userData.artKey : undefined
  const instanceBaseId = entity.has('cardInstance')
    ? entity.get('cardInstance').base
    : undefined

  const newArtKey = entity.has('attachedTo')
    ? undefined
    : (isCharacter ? getCharacterAtlasKey : getCardAtlasKey)(cachedInstance)
  const needsArtUpdate = newArtKey !== oldArtKey || zone === 'Graveyard'

  if (__rarityOverride) {
    cachedInstance.state.view.rarity = __rarityOverride
  }
  const rarity = cachedInstance.state.view.rarity

  if (owner !== undefined) {
    entity.toggleComponent(PlayerComponent, owner === 'Player')
  }

  if (!entity.has('cardInstance') || needsArtUpdate) {
    // if we need to update art, remove the card instance so that we regenerate the visuals
    entity.remove('cardInstance')
    // This prevents us from running the art generation twice.
    // If we didn't clear interactives here, it would get added to the VisibleCardArt archetype
    // and immediately removed when we ran updateInteractives
    clearInteractivesForCard(entity)
    entity.add(new CardInstanceComponent(cachedInstance))

    buildBaseChangeMSA(cachedInstance, entity)
  }
  entity.set('frameStyle', rarity)

  const lookNormal = instanceBaseId
    ? __heroAbilitiesThatShouldLookLikeNormalCardsInChooseZone.includes(
        instanceBaseId
      )
    : false
  const isHeroAbility =
    cachedInstance.state.view.type === 'heroAbility' && !lookNormal
  const isSilenced = cachedInstance.state.view.isSilenced

  entity.toggle(HeroAbilityComponent, isHeroAbility)
  if (isHeroAbility) {
    entity.toggle(HeroAbilitySilencedComponent, isSilenced)
  }

  for (const trait of traitBadgeOrder) {
    entity.toggleComponent(
      traitToComponentsMap[trait],
      cachedInstance.state.view.traits.includes(trait) &&
        (trait !== 'dash' ||
          cachedInstance.state.view.attackRestrictions.includes('Dash'))
    )
  }
  const newTriggers = isSilenced
    ? []
    : cachedInstance.state.effectTypes.map(e => e)
  const existingTriggers = entity.has('triggersHolder')
    ? entity.get('triggersHolder')
    : []
  const triggersChanged =
    existingTriggers.length !== newTriggers.length ||
    !existingTriggers.every((t, i) => newTriggers[i] == t)
  if (triggersChanged) {
    entity.remove('triggersHolder')
    entity.add(new TriggersHolderComponent(newTriggers))
  }

  if (entity && entity.has('colorizeableMesh') && !entity.has('heroAbility')) {
    const mat = entity.get('colorizeableMesh')
    if (mat) {
      mat.colorMatrixStackWhole.deathGrayscale.animator.value =
        instance.state.view.markedForDeath !== undefined
    }
  }

  entity.toggle(
    SleepingComponent,
    cachedInstance.state.view.attackState === 'Sleeping'
  )

  if (isHero && isMarkedForDeath) {
    if (!entity.has('overkill') && healthBeforeEvent) {
      entity.add(
        new OverkillComponent({
          preDeathHealth: healthBeforeEvent || 0
        })
      )
    }
    let delay = animationDelay(50)
    // if hero is attacking, wait until it finishes for death animation
    if (
      entity.has('isAnimating') &&
      context.parentPhase?.type === 'Attack' &&
      context.parentPhase.payload.attacker === cachedInstance.id
    ) {
      delay = entity.get('isAnimating').finishedFull
    }
    delay.then(async () => {
      const playerAction = context.playerAction[1].type
      if (playerAction === 'Abandon' || playerAction === 'Concede') {
        await buildSmallHeroDeathMSA(entity)
      } else {
        await buildBigHeroDeathMSA(entity)
      }
    })
  }
}
