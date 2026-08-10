import { closeEnough } from '@opensky/shared/utils/math'
import { CardLibrary, Type } from '@skyweaver/state-metadata'
import { Entity, System } from 'gg'
import { EntityChangeEvent } from 'gg/dist/ecs/Entity'
import { Matrix4, Vector3 } from 'three'

import { Components } from '~/components'
import CharacterComponent from '~/components/CharacterComponent'
import FrontFacesVisibleComponent from '~/components/FrontFacesVisibleComponent'
import HostingAttachmentComponent from '~/components/HostingAttachmentComponent'
import InspectingComponent from '~/components/InspectingComponent'
import { ATTACHMENT_TRANSFORMS } from '~/data/AttachmentConstants'
import {
  attachmentCardVisuals,
  attachmentHostCardsNotInHand,
  attachmentHosts,
  attachmentHostsCharacters,
  attachmentHostsInHand,
  frontFacingAttachments
} from '~/helpers/compoundCollections'
import { enchantIdsByName } from '~/helpers/enchantmentHelpers'
import { ownedZoneCollections } from '~/helpers/zoneCollections'
import CardArtMeshMaterial from '~/materials/CardArtMeshMaterial'
import { useCardColorOverlays } from '~/tempDesignOptions'
import { CardStatus } from '~/types'
import { findAndAffectCardArtMaterial } from '~/utils/findAndAffectCardArtMaterial'
import { findObject3DsWhoseNamesInclude } from '~/utils/threeUtils'
import {
  copyTransformMatrixWorld,
  vector3CloseEnough
} from '~/utils/transformUtils'

import { Easing } from './animation/Easing'
import { simpleTweener } from './animation/tweeners'
import { isTransformAnimating } from './animation/zoneSeatUtils'
// import { moveSeat } from './animation/zoneSeatUtils'
import { sortEntitiesByOrder } from './cardPositioning/ecsUtils'
import { fakeMinCardsInHandForSpacing } from './cardPositioning/ZoneSystem'
const __tempMat = new Matrix4()

function __tweenAttachmentProp<T extends object>(
  target: T,
  propertyGoals: Partial<{
    [K in keyof T]: T[K] extends number ? number : never
  }>
) {
  simpleTweener.to({
    description: 'tween attachment prop',
    target,
    propertyGoals,
    duration: 200,
    easing: Easing.Quintic.Out
  })
}

function __onAddAttachmentHandleChange(
  hostingEntity: Entity<Components>,
  offset: Vector3,
  scale: number
) {
  const hosting = hostingEntity.get('hostingAttachment')
  if (hosting) {
    if (!closeEnough(scale, hosting.scale)) {
      __tweenAttachmentProp(hosting, { scale })
    }
    if (!vector3CloseEnough(offset, hosting.offset)) {
      __tweenAttachmentProp(hosting.offset, {
        x: offset.x,
        y: offset.y,
        z: offset.z
      })
    }
  } else {
    console.warn('attachment missing a host!')
  }
}

// This number was derived by experimentation.
// After this many cards in hand, the rightmost attach
// falls under the screen border if it's not centered
const maxHandSizeToCenterRightmostAttach = 6

function __getHandCardOffset(
  indexInHand: number,
  handSize: number,
  entity: Entity<Components>
) {
  const isLastCardInHand = indexInHand === handSize - 1
  const distanceFromMiddle = Math.abs(indexInHand - (handSize - 1) / 2)
  const offset = ATTACHMENT_TRANSFORMS.spellHomeHand.offset.clone()
  offset.z += distanceFromMiddle * -0.001
  if (entity.has('inspecting')) {
    offset.z = ATTACHMENT_TRANSFORMS.spellHome.offset.z
  }
  if (
    isLastCardInHand &&
    (handSize < maxHandSizeToCenterRightmostAttach || entity.has('inspecting'))
  ) {
    offset.x = ATTACHMENT_TRANSFORMS.spellHome.offset.x
  } else {
    offset.x += Math.max(0, handSize - fakeMinCardsInHandForSpacing) * -0.005
  }
  return offset
}

function __inferAttachmentTransform(entH: Entity<Components>) {
  if (entH.has('character')) {
    return ATTACHMENT_TRANSFORMS.spellHomeToken
  } else if (!entH.has('inHand')) {
    return ATTACHMENT_TRANSFORMS.spellHome
  } else {
    const handCards = ownedZoneCollections.Player_Hand.items
    if (handCards.includes(entH)) {
      return {
        scale: ATTACHMENT_TRANSFORMS.spellHomeHand.scale,
        offset: __getHandCardOffset(
          handCards.indexOf(entH),
          handCards.length,
          entH
        )
      }
    } else {
      return undefined
    }
  }
}

type OffsetType = 'middle' | 'topLeft'
type Offsets = { [K in OffsetType]: Vector3 }

const __attachedManaGemDepth = 0.001
const __spellOffsets = {
  middle: new Vector3(0, __attachedManaGemDepth, -0.01),
  topLeft: new Vector3(-0.008, __attachedManaGemDepth, -0.008)
}

const __heroAbilityOffsets = {
  middle: new Vector3(0, __attachedManaGemDepth, -0.01),
  topLeft: new Vector3(-0.0075, __attachedManaGemDepth, -0.0055)
}

const s = 0.92
const __gemPositions: { [K in Type]: Offsets } = {
  enchant: {
    middle: new Vector3(0, __attachedManaGemDepth, -0.01),
    topLeft: new Vector3(-0.00725 * s, __attachedManaGemDepth, -0.00725 * s)
  },
  hero: __spellOffsets,
  spell: __spellOffsets,
  unit: __spellOffsets,
  heroAbility: __heroAbilityOffsets
}

function __getCorrectAttachedManaGemOffset(entity: Entity<Components>) {
  const entH = entity.get('attachedTo')!.entity
  const center = entH.has('character')
  const offsets =
    __gemPositions[CardLibrary.get(entity.get('cardInstance').base)!.type]
  return center ? offsets.middle : offsets.topLeft
}

export function getAttachedManaGemOffset(
  attachmentType: Type,
  offsetType: OffsetType
) {
  const offsets = __gemPositions[attachmentType]
  return offsets[offsetType]
}

export function maybeAdjustAttachedManaGem(
  entity: Entity<Components>,
  instant = false
) {
  if (!entity.has('attachedTo')) {
    return
  }
  if (entity.has('dragging') || !entity.has('cardInstance')) {
    return
  }
  const manaGems = findObject3DsWhoseNamesInclude(
    entity.get('mesh'),
    'mana-gem'
  )
  if (manaGems.length === 1) {
    const offset = __getCorrectAttachedManaGemOffset(entity)
    const manaGemPos = manaGems[0].position
    if (!instant && !vector3CloseEnough(offset, manaGemPos)) {
      __tweenAttachmentProp(manaGemPos, {
        x: offset.x,
        y: offset.y,
        z: offset.z
      })
    } else {
      manaGemPos.copy(offset)
    }
  }
}

function __onCardCharacterChangeMaybeAdjustAttachedManaGem(
  ev: EntityChangeEvent<Components>
) {
  if (ev.component instanceof CharacterComponent) {
    maybeAdjustAttachedManaGem(ev.entity.get('hostingAttachment')!.entity)
  } else if (
    ev.component instanceof HostingAttachmentComponent &&
    ev.type === 'remove'
  ) {
    ev.entity.removeOnChange(__onCardCharacterChangeMaybeAdjustAttachedManaGem)
  }
}

export default class AttachmentSystem extends System<Components> {
  private _registryHostByAttachment = new Map<
    Entity<Components>,
    Entity<Components>
  >()
  init() {
    attachmentCardVisuals.listenForAdd(entA => {
      if (!entA.has('attachedTo')) {
        return
      }
      const attachedTo = entA.get('attachedTo')
      const entH = attachedTo.entity

      // Always reset the hostingAttachment component
      // to ensure it's pointing to us.
      entH.remove('hostingAttachment')

      const startingTransform =
        __inferAttachmentTransform(entH) || ATTACHMENT_TRANSFORMS.spellHomeToken
      const host = new HostingAttachmentComponent(
        entA,
        () => this.handleAttachedEntity(entA),
        startingTransform.offset,
        startingTransform.scale
      )
      entH.add(host)
      this._registryHostByAttachment.set(entA, entH)
      entH.get('hostingAttachment').instantMoveMyAttachments()
    })
    attachmentCardVisuals.listenForRemove(entA => {
      const entH = this._registryHostByAttachment.get(entA)!
      if (
        entH.has('hostingAttachment') &&
        entH.get('hostingAttachment').entity === entA
      ) {
        entH.remove('hostingAttachment')
      }
      this._registryHostByAttachment.delete(entA)
    })
    attachmentCardVisuals.listenForAdd(entA => {
      if (!entA.has('attachedTo')) {
        return
      }
      const attachedTo = entA.get('attachedTo')
      const entH = attachedTo.entity
      maybeAdjustAttachedManaGem(entA, true)
      entA
        .get('attachedTo')
        .entity.onChange(__onCardCharacterChangeMaybeAdjustAttachedManaGem)

      const attachedVisible = entA.has('frontFacesVisible')
      const visible = entH.has('frontFacesVisible')
      if (visible && !attachedVisible) {
        entA.add(new FrontFacesVisibleComponent())
      } else if (!visible && attachedVisible) {
        entA.remove('frontFacesVisible')
      }
    })

    const handCardEntityInspectingCleanups = new Map<
      Entity<Components>,
      () => boolean
    >()

    attachmentHostsInHand.listenForAdd(entity => {
      const t = __inferAttachmentTransform(entity)
      if (t) {
        __onAddAttachmentHandleChange(entity, t.offset, t.scale)
      }
      handCardEntityInspectingCleanups.set(
        entity,
        entity.onChange(ev => {
          if (ev.component instanceof InspectingComponent) {
            const t = __inferAttachmentTransform(ev.entity)
            if (t) {
              __onAddAttachmentHandleChange(ev.entity, t.offset, t.scale)
            }
          }
        })
      )
    })
    attachmentHostsInHand.listenForRemove(entity => {
      handCardEntityInspectingCleanups.get(entity)!()
      handCardEntityInspectingCleanups.delete(entity)
    })
    function updateHandCardAttachmentOffsets(
      hostingEntities: Array<Entity<Components>>
    ) {
      for (let i = 0; i < hostingEntities.length; i++) {
        const ent = hostingEntities[i]
        if (!ent.has('hostingAttachment')) {
          continue
        }
        const t = __inferAttachmentTransform(ent)
        if (t) {
          __onAddAttachmentHandleChange(ent, t.offset, t.scale)
        }
      }
    }
    ownedZoneCollections.Player_Hand.listenForChange(items => {
      items.sort(sortEntitiesByOrder)
      updateHandCardAttachmentOffsets(items)
    })
    attachmentHostCardsNotInHand.listenForAdd(entity => {
      const t = ATTACHMENT_TRANSFORMS.spellHome
      __onAddAttachmentHandleChange(entity, t.offset, t.scale)
    })
    attachmentHostsCharacters.listenForAdd(entity => {
      const t = ATTACHMENT_TRANSFORMS.spellHomeToken
      __onAddAttachmentHandleChange(entity, t.offset, t.scale)
    })
    attachmentHosts.listenForRemove(entH => {
      if (entH.has('mesh')) {
        if (useCardColorOverlays.value) {
          findAndAffectCardArtMaterial(
            entH.get('mesh'),
            __makeCardArtLookNotFrozen
          )
        }
      }
    })
  }
  update() {
    for (const attachedEntity of frontFacingAttachments.items) {
      this.handleAttachedEntity(attachedEntity)
    }
  }
  handleAttachedEntity(attachedEntity: Entity<Components>) {
    if (!attachedEntity.has('attachedTo')) {
      return
    }
    const attachment = attachedEntity.get('attachedTo')
    const hostEntity = attachment.entity
    if (
      attachment.active &&
      hostEntity.has('transform') &&
      hostEntity.has('hostingAttachment')
    ) {
      const attachmentHost = hostEntity.get('hostingAttachment')
      if (useCardColorOverlays.value) {
        if (hostEntity.has('character')) {
          if (
            attachmentHost.entity.get('cardInstance').base ===
            enchantIdsByName['Frozen']
          ) {
            findAndAffectCardArtMaterial(
              hostEntity.get('mesh'),
              __makeCardArtLookFrozen
            )
          }
        }
      }
      const parent = hostEntity.get('transform')
      parent.updateMatrix()
      parent.updateMatrixWorld(false)
      const ahp = attachmentHost.offset
      const ahs = attachmentHost.scale
      __tempMat.makeTranslation(ahp.x, ahp.y, ahp.z)
      __tempMat.premultiply(parent.matrixWorld)
      __tempMat.multiply(new Matrix4().makeScale(ahs, ahs, ahs))
      const target = {
        matrixWorld: __tempMat
      }
      copyTransformMatrixWorld(attachmentHost.transform, target)
      if (attachedEntity.has('zone')) {
        const zone = attachedEntity.get('zone')
        if (
          !isTransformAnimating(attachedEntity) &&
          __zoneThatPermitAttachFollow.includes(zone.current.cardStatus)
        ) {
          copyTransformMatrixWorld(attachedEntity.get('transform'), target)
        }
      }
    }
  }
}

const __zoneThatPermitAttachFollow: CardStatus[] = [
  'Attachment',
  'Dust',
  'Void',
  'Limbo',
  'Field'
]
function __makeCardArtLookNotFrozen(mat: CardArtMeshMaterial) {
  mat.colorMatrixStackFg.frozen.animator.value = false
}
function __makeCardArtLookFrozen(mat: CardArtMeshMaterial) {
  mat.colorMatrixStackFg.frozen.animator.value = true
}
