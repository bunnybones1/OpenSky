import { AdditiveBlending, Euler, Vector3 } from 'three'

import { getAssetsManager } from '~/assets/index'
import MeshComponent from '~/components/MeshComponent'
import TransformComponent from '~/components/TransformComponent'
import { createWorldEntity } from '~/helpers/worldHelpers'
import { PlayMode, TextureAnimation } from '~/systems/TextureAnimationSystem'
import { getSpriteSheetMesh } from '~/utils/geometry'

import { RENDER_ORDERS } from '../constants'

const getTriggerMesh = () => {
  const clone = getSpriteSheetMesh().clone()
  clone.renderOrder = RENDER_ORDERS.damage
  clone.name = 'TRIGGER'
  return clone.clone()
}

export function createTrigger(
  parent: number | Vector3,
  type: 'trigger' | 'aura'
) {
  const triggerMesh = getTriggerMesh()

  const anim = new TextureAnimation({
    assetsManager: getAssetsManager(),
    map: type === 'trigger' ? 'triggerAnimation' : 'auraTriggerAnimation',
    columns: 4,
    rows: 8,
    fps: 30,
    playMode: PlayMode.Once,
    materialOptions: {
      blending: AdditiveBlending
    }
  })
  triggerMesh.material = anim.material

  const triggerEntity = createWorldEntity([
    new TransformComponent({
      ...(typeof parent === 'number'
        ? { parentID: parent, position: new Vector3(0, 0.01, -0.008) }
        : { position: parent }),
      rotation: new Euler(0, 0.2, 0)
    }),
    new MeshComponent(triggerMesh)
  ])

  return triggerEntity
}
