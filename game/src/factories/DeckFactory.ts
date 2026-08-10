import { Entity } from 'gg'

import { Components } from '~/components'
import DeckComponent from '~/components/DeckComponent'
import DeckPreviewManagerComponent from '~/components/DeckPreviewManagerComponent'
import SelectableComponent from '~/components/SelectableComponent'
import TransformComponent from '~/components/TransformComponent'
import { deckClickHandlers } from '~/helpers/deckClickHandlers'
import { isValidDropTargetName } from '~/helpers/dropTargetTypes'
import { ObjPosHelper, PositionHelper } from '~/helpers/PositionHelpers'
import { getDropTarget } from '~/scenes/arena/dropTargetsLib'
import { CardStatus, OwnedCardStatus, Owner } from '~/types'

import { deckConfigs } from '../systems/cardPositioning/deckConfigs'

type DeckPrefab = { entity: Entity<Components>; transformObj: PositionHelper }
const __deckPrefabLib = new Map<OwnedCardStatus, DeckPrefab>()

export function getDeck(status: CardStatus, owner: Owner): DeckPrefab {
  const ownedCardStatus = `${owner}_${status}` as const
  if (!__deckPrefabLib.has(ownedCardStatus)) {
    const deckBaseName = `${owner.toLowerCase() as Lowercase<Owner>}-${
      status.toLowerCase() as Lowercase<CardStatus>
    }` as const

    if (isValidDropTargetName(deckBaseName)) {
      const config = deckConfigs.get(ownedCardStatus)!

      const faceUp = status === 'Graveyard' ? true : false
      const reverseOrder = status === 'Graveyard' ? true : false

      const transformObj = new ObjPosHelper()
      transformObj.position.copy(config.pos)
      transformObj.scale.multiplyScalar(1.2)
      transformObj.rotateX(Math.PI)
      // if (status === 'Deck') {
      //   transformObj.rotateY(Math.PI)
      //   transformObj.position.z += 0.006
      // }
      transformObj.updateMatrix()
      transformObj.updateMatrixWorld(true)

      const entity = getDropTarget(deckBaseName)

      entity.remove('transform')
      entity.add(
        new TransformComponent({
          obj3D: transformObj,
          name: deckBaseName
        })
      )
      entity.get('collidable').scale.z *= 1.8
      entity.add(new DeckComponent({ faceUp, reverseOrder, ownedCardStatus }))
      entity.add(new DeckPreviewManagerComponent())

      // const onSelect = (deckClickHandlers as Record<
      //   string,
      //   undefined | (() => void)
      // >)[ownedCardStatus]
      // if (onSelect) {
      //   entity.add(new SelectableComponent(onSelect))
      // }

      const onSelect = (
        deckClickHandlers as Record<string, undefined | (() => void)>
      )[ownedCardStatus]
      if (onSelect) {
        entity.add(
          new SelectableComponent(() => {
            onSelect()
            entity.remove('inspecting')
          })
        )
      }

      __deckPrefabLib.set(ownedCardStatus, { entity, transformObj })
    } else {
      throw new Error(deckBaseName + 'zone is not a valid drop target')
    }
  }
  return __deckPrefabLib.get(ownedCardStatus)!
}
