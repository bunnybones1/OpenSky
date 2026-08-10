import device from '@opensky/shared/device'
import { Player } from '@skyweaver/state-metadata'
import { Entity } from 'gg'
import { Vector3 } from 'three'

import { toggleCardBase } from '~/assemblages/CardAssemblage'
import { Components } from '~/components'
import { RelaxedCardInstance } from '~/components/CardInstanceComponent'
import GamePinCushionComponent from '~/components/GamePinCushionComponent'
import ScreenSpaceComponent from '~/components/ScreenSpaceComponent'
import { TIPS_BOX_WIDTH } from '~/constants'
import {
  CardPopupExpandDirection,
  createCardPopup
} from '~/factories/CardPopupFactory'
import { changeFoilContext } from '~/foils/foilHelpers'
import { getOwner } from '~/helpers/cardHelpers'
import { ReadonlyPin } from '~/helpers/LayoutHelpers'
import { playSound } from '~/helpers/soundHelpers'
import { removeWorldEntity } from '~/helpers/worldHelpers'
import CardAspectInfoBoxes, {
  makeCardAspectInfoBoxes
} from '~/meshes/CardAspectInfoBoxes'
import GlobalEffectBoxes, {
  makeGlobalEffectBoxes
} from '~/meshes/GlobalEffectBoxes'
import Object2D from '~/meshes/Object2D'
import queryParams from '~/queryParams'
import { scene } from '~/scenes/arena/scene'
import { store } from '~/state/index'
import { showTooltipsOnHover } from '~/userSettings'
import { cameraShaker } from '~/utils/cameraShaker'
import { getReferencedCardInstances } from '~/utils/card'
import { globalAccess } from '~/utils/globalAccess'
import { taskTimer, TimedTask } from '~/utils/taskTimer'

import addTooltipScreenspaceProtector from '../helpers/addTooltipScreenspaceProtector'

let _addTooltipScreenspaceProtector = addTooltipScreenspaceProtector

if (import.meta.hot) {
  import.meta.hot.accept(
    '../helpers/addTooltipScreenspaceProtector',
    (mod: any) => {
      _addTooltipScreenspaceProtector = mod.default
    }
  )
}

const camera = cameraShaker.camera

let forceOpened = false
let nextHoverEntity: Entity<Components> | undefined
let activeHoverEntity:
  | {
      hovered: Entity<Components>
      popupEntity?: Entity<Components>
      explainers?: CardAspectInfoBoxes | GlobalEffectBoxes
    }
  | undefined
const __vec3 = new Vector3()

let delayedShowHoverCard: TimedTask | undefined

let enabled = true

export function disableCardPopupManager() {
  enabled = false
  dispose()
  if (delayedShowHoverCard) {
    taskTimer.cancel(delayedShowHoverCard)
    delayedShowHoverCard = undefined
  }
}
export function enableCardPopupManager() {
  enabled = true
}

/**
 *  Don't call this directly, use the one in cardPopupHelpers instead.
 */
export function INTERNAL_DO_NOT_USE_OR_YOU_WILL_BE_FIRED_setHoveredCardAsync(
  cardEntity: Entity<Components> | undefined,
  delay: number = 0.2,
  expandDirection: CardPopupExpandDirection = 'right',
  force = false,
  hideTooltips = !showTooltipsOnHover.value
): void {
  if (!enabled) {
    return
  }

  if (forceOpened && !force) {
    return
  }
  forceOpened = force

  if (!cardEntity && force) {
    forceOpened = false
  }

  if (nextHoverEntity !== cardEntity) {
    if (delayedShowHoverCard) {
      taskTimer.cancel(delayedShowHoverCard)
      delayedShowHoverCard = undefined
    }
    nextHoverEntity = cardEntity
  }
  if (nextHoverEntity !== activeHoverEntity && !delayedShowHoverCard) {
    if (activeHoverEntity && nextHoverEntity) {
      setHoveredCard(nextHoverEntity, expandDirection, hideTooltips)
    } else {
      delayedShowHoverCard = taskTimer.add(
        () => {
          delayedShowHoverCard = undefined
          setHoveredCard(cardEntity, expandDirection, hideTooltips)
        },
        delay,
        true
      )
    }
  }
}

function dispose() {
  if (!activeHoverEntity) {
    return
  }
  if (activeHoverEntity.popupEntity) {
    if (activeHoverEntity.popupEntity.has('transform')) {
      const transform = activeHoverEntity.popupEntity.get('transform')

      // Remove the popup and explainers from the parent transform
      transform.parent?.remove(transform)
    }

    // Delete the entity (and all sub entities based on transform chaining)
    removeWorldEntity(activeHoverEntity.popupEntity.id)
  }

  if (activeHoverEntity.explainers) {
    activeHoverEntity.explainers?.parent?.remove(activeHoverEntity.explainers)
  }
  activeHoverEntity = undefined
}

function setHoveredCard(
  cardEntity: Entity<Components> | undefined,
  expandDirection: CardPopupExpandDirection = 'right',
  hideTooltips: boolean
): true | void {
  if (!enabled) {
    return
  }

  const wasActive = Boolean(activeHoverEntity)

  if (
    queryParams.disableCardHoverPopups ||
    !cardEntity ||
    !cardEntity.has('cardInstance')
  ) {
    return dispose()
  }

  const card = cardEntity.get('cardInstance') as Readonly<RelaxedCardInstance>

  // if we hovered the same card again, don't re-create the popup.
  if (
    activeHoverEntity &&
    activeHoverEntity.hovered === cardEntity &&
    (!activeHoverEntity.explainers ||
      activeHoverEntity.explainers.direction === expandDirection)
  ) {
    return
  }

  dispose()

  const owner = getOwner(cardEntity.has('player'))
  const attachmentEntity = cardEntity.has('hostingAttachment')
    ? cardEntity.get('hostingAttachment').entity
    : undefined
  const attachment =
    attachmentEntity && attachmentEntity.has('cardInstance')
      ? attachmentEntity.get('cardInstance')
      : undefined

  const popupEntity =
    card.base === 'Hero'
      ? undefined
      : createCardPopup(
          card,
          attachment,
          owner,
          expandDirection,
          cardEntity.has('zone') &&
            cardEntity.has('interactiveIndicators') &&
            cardEntity.get('interactiveIndicators').playableState.value
        )

  const cardZone = cardEntity.has('zone')
    ? cardEntity.get('zone').current.cardStatus
    : 'Void'

  playSound('audioFxCommon', 'CardHov')

  if (popupEntity) {
    const shouldShowBase = cardZone === 'Field'
    toggleCardBase(popupEntity, shouldShowBase)

    const hoverTransform = popupEntity.get('transform')
    scene.add(hoverTransform)

    cardEntity.get('transform').getWorldPosition(__vec3)
    __vec3.project(camera)

    updateHoverCard(cardEntity, popupEntity)
  }

  const cardAndReferences = [card, ...getReferencedCardInstances(card)]
  const hasMoreThanOneCard = cardAndReferences.length > 1

  let putTipsOnLeft = false
  if (device.isMobile && cardEntity.has('transform')) {
    const inHandCardTransform = cardEntity.get('transform')
    putTipsOnLeft = inHandCardTransform.position.x > 0
  } else {
    putTipsOnLeft =
      expandDirection === 'right'
        ? __vec3.x > -0.33 || hasMoreThanOneCard
        : !(__vec3.x < 0.33 || hasMoreThanOneCard)
  }

  let explainers: GlobalEffectBoxes | CardAspectInfoBoxes | undefined
  if (!hideTooltips) {
    if (card.base === 'Hero') {
      const owner = cardEntity.has('player') ? store.player! : 1 - store.player!
      explainers = makeGlobalEffectBoxes(
        card,
        TIPS_BOX_WIDTH + 50,
        putTipsOnLeft,
        owner as Player
      )
    } else {
      explainers = makeCardAspectInfoBoxes(
        [
          {
            base: card.base,
            traits: card.state.view.traits
          }
        ],
        TIPS_BOX_WIDTH,
        putTipsOnLeft
      )
    }
    const hudContainer = globalAccess.ui!.getContainer('hud')

    if (popupEntity && explainers) {
      hudContainer.add(explainers)

      let tooltipsHeightSum = 0
      for (const tooltip of explainers.children) {
        if (tooltip instanceof Object2D) {
          tooltipsHeightSum += tooltip.matrix.size.y.offset
        }
      }
      let tooltipsYOffset =
        tooltipsHeightSum < 275 ? 0 : 0.0001 * (tooltipsHeightSum - 275)
      if (
        tooltipsHeightSum > 400 &&
        device.isDesktop &&
        cardEntity.has('player')
      ) {
        tooltipsYOffset += 0.02
      }

      const offset = new Vector3(
        putTipsOnLeft ? -0.03 : 0.029,
        0.002,
        -(0.03 + tooltipsYOffset)
      )
      explainers.matrix.offset = GamePinCushionComponent.getPin(
        popupEntity ?? cardEntity,
        offset
      )
      explainers.matrix.anchor = putTipsOnLeft
        ? ReadonlyPin.TopRight
        : ReadonlyPin.TopLeft

      _addTooltipScreenspaceProtector(popupEntity, offset, putTipsOnLeft)
    }
  }

  if (popupEntity) {
    const hoverTransform = popupEntity.get('transform')
    const direction = hoverTransform.position.x < 0 ? 1 : -1
    const offset =
      cardZone === 'Hand'
        ? new Vector3(0, 0, cardEntity.has('player') ? -0.06 : 0.06)
        : new Vector3(0.04 * direction, 0, 0)
    popupEntity.add(
      new ScreenSpaceComponent(hoverTransform, offset, wasActive ? 1 : 0.35)
    )
  }

  activeHoverEntity = {
    hovered: cardEntity,
    popupEntity,
    explainers
  }
}

function updateHoverCard(
  entity: Entity<Components>,
  popupEntity: Entity<Components>
) {
  const transform = entity.get('transform')
  transform.getWorldPosition(__vec3)

  const popupTransform = popupEntity.get('transform')
  __vec3.project(camera) // get screen-space position

  __vec3.z = 0.85
  __vec3.unproject(camera)
  popupTransform.position.copy(__vec3)

  // face the screen
  popupTransform.quaternion.copy(camera.quaternion)
  popupTransform.rotation.x += Math.PI / 2

  changeFoilContext(popupEntity, 'default')
}
