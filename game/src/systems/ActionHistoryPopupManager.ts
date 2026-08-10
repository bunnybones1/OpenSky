import { CardInstance, SkyWeaver } from '@skyweaver/state-metadata'
import { Entity } from 'gg'
import { Vector3 } from 'three'

import { Components } from '~/components'
import { RelaxedCardInstance } from '~/components/CardInstanceComponent'
import ScreenSpaceComponent from '~/components/ScreenSpaceComponent'
import {
  CardPopupExpandDirection,
  createCardPopup
} from '~/factories/ActionHistoryPopupFactory'
import { getOwner } from '~/helpers/cardHelpers'
import { playSound } from '~/helpers/soundHelpers'
import { removeWorldEntity } from '~/helpers/worldHelpers'
import queryParams from '~/queryParams'
import { scene } from '~/scenes/arena/scene'
import { SidebarStatus } from '~/scenes/ui/components/SlideOutSidebar/constants'
import { cameraShaker } from '~/utils/cameraShaker'
import { globalAccess } from '~/utils/globalAccess'
import { taskTimer, TimedTask } from '~/utils/taskTimer'

const camera = cameraShaker.camera

let nextHoverEntity: Entity<Components> | undefined
let activeHoverEntity: Entity<Components> | undefined
const __vec3 = new Vector3()

let delayedShowHoverCard: TimedTask | undefined

let enabled = true

export function disableActionHistoryPopupManager() {
  enabled = false
  dispose()
}

export function enableActionHistoryPopupManager() {
  enabled = true
}

/**
 *  Don't call this directly, use the one in cardPopupHelpers instead.
 *  */
export function _setHoveredActionHistoryCardAsync(
  cardEntity: Entity<Components> | undefined,
  attachment: CardInstance<SkyWeaver> | undefined,
  delay: number = 0.2,
  expandDirection: CardPopupExpandDirection = 'right'
): void {
  // TODO find out why hover events still come through after the game is over
  if (!enabled) {
    return
  }

  if (nextHoverEntity !== cardEntity) {
    if (delayedShowHoverCard) {
      taskTimer.cancel(delayedShowHoverCard)
      delayedShowHoverCard = undefined
    }
    nextHoverEntity = cardEntity
  }
  if (nextHoverEntity) {
    if (nextHoverEntity !== activeHoverEntity && !delayedShowHoverCard) {
      if (activeHoverEntity) {
        setHoveredCard(nextHoverEntity, attachment, expandDirection)
      } else {
        delayedShowHoverCard = taskTimer.add(
          () => {
            delayedShowHoverCard = undefined
            setHoveredCard(cardEntity, attachment, expandDirection)
          },
          activeHoverEntity ? 0 : delay,
          true
        )
      }
    }
  } else {
    setHoveredCard(nextHoverEntity, attachment, expandDirection)
  }
}

function dispose() {
  if (activeHoverEntity) {
    if (activeHoverEntity.has('transform')) {
      const transform = activeHoverEntity.get('transform')

      // Remove the popup from the parent transform
      transform.parent!.remove(transform)
      activeHoverEntity.remove('screenSpace')
    }

    // Delete the entity (and all sub entities based on transform chaining)
    removeWorldEntity(activeHoverEntity.id)

    activeHoverEntity = undefined
  }
}

function setHoveredCard(
  cardEntity: Entity<Components> | undefined,
  attachment: CardInstance<SkyWeaver> | undefined,
  expandDirection: CardPopupExpandDirection = 'right'
): void {
  if (
    queryParams.disableCardHoverPopups ||
    !cardEntity ||
    !cardEntity.has('cardInstance')
  ) {
    return dispose()
  }

  const card = cardEntity.get('cardInstance') as Readonly<RelaxedCardInstance>

  if (
    activeHoverEntity &&
    activeHoverEntity.has('cardInstance') &&
    activeHoverEntity.get('cardInstance') === card
  ) {
    return
  }

  dispose()

  const owner = getOwner(cardEntity.has('player'))
  activeHoverEntity = createCardPopup(
    card,
    attachment,
    owner,
    expandDirection,
    cardEntity
  )
  if (!activeHoverEntity) {
    return
  }

  playSound('audioFxCommon', 'CardHov')

  // updateHoverCard(cardEntity)
  const hoverTransform = activeHoverEntity.get('transform')
  scene.add(hoverTransform)

  updateHoverCard(cardEntity)

  const direction = hoverTransform.position.x < 0 ? 1 : -1
  const graveOpen =
    globalAccess.ui!.getContainer('deckSidebars').playerGraveyardSidebar
      .status == SidebarStatus.Revealed
  const offset = new Vector3(
    0.04 * direction + (graveOpen ? 0.08 : 0),
    0,
    0.015
  )
  activeHoverEntity.add(new ScreenSpaceComponent(hoverTransform, offset, 0.35))
}

function updateHoverCard(entity: Entity<Components>) {
  if (!activeHoverEntity) {
    return
  }
  const transform = entity.get('transform')
  transform.getWorldPosition(__vec3)
  __vec3.project(camera) // get screen-space position
  const activeHoverEntityTransform = activeHoverEntity.get('transform')

  __vec3.z = 0.905
  __vec3.unproject(camera)
  activeHoverEntityTransform.position.copy(__vec3)
  activeHoverEntityTransform.scale.multiplyScalar(0.75)

  // face the screen
  activeHoverEntityTransform.quaternion.copy(camera.quaternion)
  activeHoverEntityTransform.rotation.x += Math.PI / 2
}
