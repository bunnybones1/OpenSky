import { Object3D } from 'three'

import { createBuff } from '~/factories/BuffFactory'
import { animationDelay } from '~/utils/asyncUtils'

import TextMesh from '../text/TextMesh'
import { Easing } from './Easing'
import { simpleTweener } from './tweeners'

export async function createBuffAnimation(
  parent: Object3D,
  buffAdded: number,
  scale = 1
) {
  const buff = createBuff(buffAdded, parent)
  const textMesh = buff.children[1] as TextMesh
  if (buff) {
    buff.scale.set(scale, scale, scale)
  }
  textMesh.opacity = 0
  ;(async () => {
    simpleTweener.to({
      description: 'show buff indicator',
      target: textMesh,
      propertyGoals: { opacity: 1 },
      duration: 200,
      easing: Easing.Cubic.Out
    })

    simpleTweener.to({
      description: 'slide buff indicator',
      target: textMesh.position,
      propertyGoals: {
        z: textMesh.position.z - 0.05
      },
      duration: 2000
    })

    await animationDelay(500)

    simpleTweener.to({
      description: 'fade buff indicator',
      target: textMesh,
      propertyGoals: { opacity: 0 },
      duration: 500,
      easing: Easing.Cubic.Out
    })
    parent.remove(buff)
  })()
  await animationDelay(150)
}
