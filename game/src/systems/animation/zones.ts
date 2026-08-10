import { translate } from '@opensky/language-manager'
import { FindByType } from '@opensky/shared/typeHelpers'
import { CardEvent, CardLibrary, SkyWeaver } from '@skyweaver/state-metadata'
import { Entity } from 'gg'

import { CardCacheWithEntities } from '~/cardCache'
import { Components } from '~/components'
import AttachedToComponent from '~/components/AttachedToComponent'
import { ZoneData } from '~/components/ZoneComponent'
import { enchantNamesByCardId } from '~/helpers/enchantmentHelpers'
import { playSound } from '~/helpers/soundHelpers'
import { removeWorldEntity } from '~/helpers/worldHelpers'
import { store } from '~/state'
import { matchInfoStore } from '~/state/stores/MatchInfoStore'
import { getCardName, TabbedLogger } from '~/utils/fancyLogs'
import { waitForNextFrame } from '~/utils/onNextFrame'
import { world } from '~/world'

import { ActionStack } from '../AnimationOrchestrator'
import TextMesh from '../text/TextMesh'
import TwitchExtensionSystem from '../TwitchExtensionSystem'
import { createAttachmentPopupAnimation } from './attachmentPopup'
import {
  maybeEndAttributionTracker,
  maybeStartAttributionTracker
} from './attributionTracker'

export async function animateMoveCard(
  cardCache: CardCacheWithEntities,
  context: ActionStack,
  logger: TabbedLogger | undefined,
  payload: FindByType<CardEvent<SkyWeaver>, 'MoveCard'>['payload'],
  entity: Entity<Components>
) {
  const to = payload.to
  const from = payload.from

  const toZone = to.location[0].name
  if (!entity.has('zone')) {
    // bail if it doesn't have a zone component
    return
  }

  const zoneData = entity.get('zone')

  while (entity.has('isAnimating')) {
    const anim = entity.get('isAnimating')
    if (anim.cancellable) {
      anim.cancel()
      entity.remove('isAnimating')
    } else {
      await anim.finishedFull
    }
    await waitForNextFrame() //this gives multi-phase animations a chance to play out
  }

  const isFromLimbo =
    !from.location ||
    (from.location[0].name === 'Limbo' &&
      zoneData.current.cardStatus === 'Void')
  const isConjure = isFromLimbo && context.parentPhase?.type === 'Draw'
  // come from portal for creations (except for attachments) & conjures
  const comeFromPortal =
    isConjure ||
    (isFromLimbo &&
      to.location?.[0].name !== 'Attachment' &&
      to.location?.[0].name !== 'CardSelection')

  let attributionTrackerStarted = false

  async function attemptToStartAttributionTracker(wait = true) {
    if (attributionTrackerStarted) {
      return
    }
    attributionTrackerStarted = true
    const p = maybeStartAttributionTracker(
      'moveToZone',
      cardCache,
      context,
      payload.to
    )
    if (wait) {
      await p
    }
  }

  if (context.playerAction && context.playerAction[1].type === 'Setup') {
    await attemptToStartAttributionTracker()
    zoneData.instantaneous = true
    zoneData.setUserZone('UseState')
  } else if (comeFromPortal) {
    await attemptToStartAttributionTracker()
    zoneData.setUserZone('Conjuring')
    await maybeAnimateZone(zoneData)
  }
  await attemptToStartAttributionTracker(to.location[0].name !== 'Attachment')

  if (to.location[0].name === 'Limbo') {
    if (logger) {
      logger.logStory(`${getCardName(to)} unit moved to limbo zone.`)
    }
    return
  }

  if (logger) {
    logger.logStory(
      `${getCardName(to)} going from zone ${JSON.stringify(
        from
      )} to zone ${JSON.stringify(to)}`
    )
  }

  entity.remove('dragging')

  if (from.location?.[0].name === 'Field' && entity.has('transform')) {
    entity.get('transform').traverse(obj => {
      if (obj instanceof TextMesh) {
        obj.changeLiveProp(undefined)
      }
    })
  }

  if (logger) {
    logger.logStory(`${getCardName(to)} arrived in zone ${JSON.stringify(to)}`)
  }
  // For attached spells
  if (from.location?.[0].name === 'Attachment') {
    const parent = cardCache.getInstance(from.location?.[0].parent)
    if (parent) {
      parent.attachment = undefined
    }
    if (to.location[0].name !== 'Dust') {
      // the only move animation where attached spells should stay "attached"
      // is when they're being dusted, so they don't become full
      // cards again.
      entity.remove('attachedTo')
    }
  }
  let nevermind = false
  if (to.location[0].name === 'Attachment') {
    const parentEntity = cardCache.getEntity(to.location[0].parent)
    const parentLocation = parentEntity && cardCache.getLocation(parentEntity)
    const goingToAnySecret =
      parentLocation && !cardCache.isZonePublic(parentLocation.location[0])
    const goingToOurSecret = parentLocation?.player === store.player
    // We can only attach to cards that are visible to our client.
    // If we're attaching to a secret card, it must be our secret card.
    // If we would attach to a secret card that isn't ours, self-destruct instead.
    if (
      parentEntity &&
      parentLocation &&
      (!goingToAnySecret || goingToOurSecret)
    ) {
      if (
        context.playerAction &&
        context.playerAction[1].type !== 'Setup' &&
        parentEntity.has('frontFacesVisible') &&
        (!parentEntity.has('zone') ||
          parentEntity.get('zone').stateZone !== 'Graveyard') &&
        !enchantNamesByCardId.has(entity.get('cardInstance').base)
      ) {
        playSound('audioFxCommon', 'AttachSpell')
      }
      const parent = cardCache.getInstance(to.location[0].parent)
      if (parent && entity.has('cardInstance')) {
        parent.attachment = entity.get('cardInstance').id
      }
      if (!entity.has('attachedTo')) {
        entity.add(new AttachedToComponent(parentEntity))
      }
      if (
        matchInfoStore.gameStarted &&
        store.state &&
        store.state.state.players.every(player => player.doneCardSelection)
      ) {
        const view = cardCache.getInstance(to)
        const parentZone = parentLocation.location[0].name
        if (
          view &&
          parentZone !== 'Deck' &&
          parentZone !== 'Graveyard' &&
          entity.has('frontFacesVisible')
        ) {
          const card = CardLibrary.get(view.base)!

          const cardName = translate.card.name(view.base)
          if (!cardName) {
            console.error('Attachment has no name!!!')
          }

          createAttachmentPopupAnimation(
            parentEntity,
            cardName ?? '',
            card.spellBehaviour || 'neutral'
          )
        }
      }
    } else {
      // Either there was no parent entity, or the parent's location is secret,
      // and that secret isn't ours.
      // So this attachment is being concealed, and we should self-destruct it.
      cardCache.removeEntity(entity)
      removeWorldEntity(entity.id)
      nevermind = true
    }
  }

  // Ensure the card's location components are updated when it hits the new zone.
  if (entity.has('order')) {
    entity.set('order', payload.to.location[1])
  }

  // This is required to make overdraw in hand work with order components.
  // Later, we should improve this in CMS to emit better order change events.
  cardCache.forEachEntity((otherEnt, location) => {
    if (
      location.location[0].name === payload.to.location[0].name &&
      location.player === payload.to.player &&
      otherEnt.has('order')
    ) {
      otherEnt.set('order', location.location[1])
    }
  })
  if (entity.has('zone')) {
    entity
      .get('zone')
      .setOwner(payload.to.player === store.player ? 'Player' : 'Opponent')
  }
  if (!nevermind) {
    zoneData.setStateZone(toZone)
    zoneData.setUserZone('UseState')
    const moveToFinalZone = maybeAnimateZone(zoneData)
    if (!comeFromPortal) {
      // this is async, but we want conjures to overlap, and this will wait for full portal,
      // so we early exit if this is conjure & don't await it
      await moveToFinalZone
    }
  }
  world.getSystem(TwitchExtensionSystem).signalNeedsUpdate()

  await maybeEndAttributionTracker('moveToZone', cardCache, context, payload.to)
}

async function maybeAnimateZone(zoneData: ZoneData) {
  if (zoneData.pendingFinalZoneChange) {
    const anim = await zoneData.pendingFinalZoneChange
    if (anim) {
      await anim.animationManditoryMinimum.finished
    }
  }
  zoneData.instantaneous = false
}
