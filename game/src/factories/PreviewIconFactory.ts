import { Entity } from 'gg'
import { Vector3 } from 'three'

import { Components } from '~/components'
import MeshComponent from '~/components/MeshComponent'
import TransformComponent from '~/components/TransformComponent'
import { createWorldEntity } from '~/helpers/worldHelpers'
import IconIndicator, { IconIndicatorName } from '~/meshes/IconIndicator'

import { RENDER_ORDERS } from '../constants'

export function createPreviewIconEntity(
  iconName: IconIndicatorName,
  parentEntity: Entity<Components>
) {
  const inHand = parentEntity.has('zone')
    ? parentEntity.get('zone').current.cardStatus === 'Hand'
    : false
  const inDeck = parentEntity.has('deck')
  const isAttachment = parentEntity.has('attachedTo')
  const isBackFacing =
    inDeck ||
    (inHand && !parentEntity.has('isRevealed') && !parentEntity.has('player'))
  const iconMesh = new IconIndicator(iconName)

  iconMesh.renderOrder = RENDER_ORDERS.damage
  iconMesh.rotation.x = isBackFacing ? Math.PI * -0.2 : Math.PI * 0.5

  if (iconName === 'Death') {
    iconMesh.scale.setScalar(0.17)
  } else {
    iconMesh.scale.setScalar(0.1)
  }

  const z = inHand ? -0.02 : inDeck ? 0 : isAttachment ? 0 : -0.01
  const y = inDeck ? -0.02 : 0.005

  return createWorldEntity([
    new TransformComponent({
      parentID: parentEntity.id,
      position: new Vector3(0, y, z)
    }),
    new MeshComponent(iconMesh)
  ])
}
