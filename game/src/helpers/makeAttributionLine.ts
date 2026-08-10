import { Object3D, Vector4 } from 'three'

import {
  makeWorldAveragePositionBetween,
  makeWorldPointAt
} from '~/helpers/makeWorldPointAt'
import QuadraticRibbonMesh from '~/meshes/QuadraticRibbonMesh'
import { Easing } from '~/systems/animation/Easing'
import { simpleTweener } from '~/systems/animation/tweeners'
import { causeAndEffectSpeed } from '~/userSettings'
import { animationDelay } from '~/utils/asyncUtils'
import { findContainingScene, removeFromParent } from '~/utils/threeUtils'

const COLOR_START = new Vector4(2, 2, 2, 1)
const COLOR_END_BLUE = new Vector4(0, 0.75, 1, 1)

export function makeAttributionBlueLine(
  from: Object3D,
  x = 0,
  y = 0,
  z = 0,
  to: Object3D,
  x2 = 0,
  y2 = 0,
  z2 = 0
) {
  return makeAttributionLine(from, x, y, z, to, x2, y2, z2, COLOR_END_BLUE)
}

export function makeAttributionLine(
  from: Object3D,
  x = 0,
  y = 0,
  z = 0,
  to: Object3D,
  x2 = 0,
  y2 = 0,
  z2 = 0,
  secondColor: Vector4
) {
  const fromHelper = makeWorldPointAt(from, x, y, z)
  const myScene = findContainingScene(from)
  if (myScene) {
    const toHelper = makeWorldPointAt(to, x2, y2, z2)
    const midHelper = makeWorldAveragePositionBetween(
      fromHelper,
      toHelper,
      0,
      0.1,
      0
    )
    const quadraticRibbonMesh = new QuadraticRibbonMesh({
      matOptions: {
        positionStart: fromHelper.worldPosition,
        positionHandle: midHelper.position,
        positionEnd: toHelper.worldPosition,
        relativeWidth: 0.05,
        color: COLOR_START,
        color2: secondColor,
        blendMode: 'screenAlpha'
      },
      geomOptionsKey: 'attributionLine'
    })
    const target = { val: 0 }
    const description = 'pulse line width'
    function onUpdate() {
      quadraticRibbonMesh.material.relativeWidth =
        Easing.Custom.FadeInOut2(target.val) * 0.05
    }
    simpleTweener.to({
      description,
      target,
      propertyGoals: { val: 0.5 },
      onUpdate
    })
    quadraticRibbonMesh.onBeforeRender = midHelper.onBeforeRender
    myScene.add(quadraticRibbonMesh)
    const duration = (1 - causeAndEffectSpeed.value) * 1000
    return {
      animInFinished: animationDelay(duration),
      animOut() {
        simpleTweener.to({
          description,
          target,
          propertyGoals: { val: 1 },
          onUpdate,
          onComplete() {
            removeFromParent(quadraticRibbonMesh)
          }
        })
        return animationDelay(duration)
      }
    }
  }
  return undefined
}
