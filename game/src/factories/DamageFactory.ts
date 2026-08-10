import {
  AdditiveBlending,
  BufferGeometry,
  Euler,
  Material,
  Mesh,
  Object3D,
  Vector3
} from 'three'

import { getAssetsManager } from '~/assets/index'
import { getGradient } from '~/colors/colorLibrary'
import MeshComponent from '~/components/MeshComponent'
import TransformComponent from '~/components/TransformComponent'
import { createWorldEntity } from '~/helpers/worldHelpers'
import * as textOptions from '~/systems/text/TextOptions'
import { PlayMode, TextureAnimation } from '~/systems/TextureAnimationSystem'
import { getSpriteSheetMesh } from '~/utils/geometry'
import { addText } from '~/utils/textUtils'

import { RENDER_ORDERS } from '../constants'

const TEXT_DEPTH = 0.0001

const getDamageMesh = () => {
  const clone = getSpriteSheetMesh().clone()
  clone.renderOrder = RENDER_ORDERS.damage
  clone.name = 'DAMAGE'
  return clone.clone()
}

export function createDamage(
  damagePositiveNumber: number,
  parentID: number,
  isFatigue: boolean,
  disableDamageMesh?: boolean
) {
  const pivot = new Object3D()
  let damageMesh: Mesh<BufferGeometry, Material | Material[]> | undefined
  if (!disableDamageMesh) {
    damageMesh = getDamageMesh()
    damageMesh.name = 'spriteAnim'
    pivot.add(damageMesh)
  }
  const anim = new TextureAnimation({
    assetsManager: getAssetsManager(),
    map: isFatigue ? 'damageFatigueAnimation' : 'damageAnimation',
    columns: 4,
    rows: 4,
    fps: 30,
    playMode: PlayMode.Once,
    materialOptions: {
      blending: AdditiveBlending
    }
  })
  if (damageMesh) {
    damageMesh.material = anim.material
  }

  const damageEntity = createWorldEntity([
    new TransformComponent({
      parentID,
      position: new Vector3(0, 0.01, -0.008),
      rotation: new Euler(0, 0.2, 0)
    }),
    new MeshComponent(pivot)
  ])

  const textMesh = addText(
    pivot,
    [
      {
        text: `-${damagePositiveNumber}`,
        color: getGradient(isFatigue ? 'fatigue' : 'negative')
      }
    ],
    isFatigue ? textOptions.damageNumberFatigue : textOptions.damageNumber,
    -0.002,
    TEXT_DEPTH,
    0
  )
  textMesh.name = 'damageText'

  textMesh.renderOrder = RENDER_ORDERS.damage + 1
  pivot.add(textMesh)

  return damageEntity
}
