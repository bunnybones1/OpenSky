import { AdditiveBlending, Group, Object3D } from 'three'

import { getAssetsManager } from '~/assets/index'
import { getGradient } from '~/colors/colorLibrary'
import * as textOptions from '~/systems/text/TextOptions'
import { PlayMode, TextureAnimation } from '~/systems/TextureAnimationSystem'
import { getSpriteSheetMesh } from '~/utils/geometry'
import { addText } from '~/utils/textUtils'

import { RENDER_ORDERS } from '../constants'

const TEXT_DEPTH = 0.0001

const getBuffMesh = () => {
  const clone = getSpriteSheetMesh().clone()
  clone.renderOrder = RENDER_ORDERS.damage
  clone.name = 'BUFF'
  return clone.clone()
}

export function createBuff(buff: number, parent: Object3D) {
  const group = new Group()
  group.position.set(0, 0.01, -0.008)
  parent.add(group)

  const buffMesh = getBuffMesh()
  const anim = new TextureAnimation({
    assetsManager: getAssetsManager(),
    map: 'buffGenericAnimation',
    columns: 4,
    rows: 8,
    fps: 60,
    playMode: PlayMode.Once,
    materialOptions: {
      blending: AdditiveBlending
    }
  })
  buffMesh.material = anim.material
  group.add(buffMesh)

  const prefix = buff >= 0 ? '+' : ''
  const textMesh = addText(
    group,
    [
      {
        text: prefix + buff,
        color: getGradient(buff > 0 ? 'positive' : 'negative')
      }
    ],
    textOptions.buffNumber,
    -0.002,
    TEXT_DEPTH,
    0
  )
  textMesh.rotation.y += 0.2
  textMesh.renderOrder = RENDER_ORDERS.damage + 1

  return group
}
