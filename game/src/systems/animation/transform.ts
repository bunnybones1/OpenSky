import { Matrix4, Quaternion, Vector3 } from 'three'

import { cloneTransform, copyTransform } from '~/utils/transformUtils'

import { Easing } from './Easing'
import { AnimatedObject, NumberEaser } from './RawTweener'
import { simpleTweener } from './tweeners'

export interface TargetTransform {
  position: Vector3
  quaternion: Quaternion
  scale: Vector3
  matrix?: Matrix4
  matrixWorld?: Matrix4
}

export function animateTransformToTarget(
  transformToAnimate: TargetTransform,
  endTransform: TargetTransform,
  duration: number = 600,
  easing: NumberEaser = Easing.Quintic.Out,
  onUpdate?: (dt: number, p: number) => void
) {
  return animateTransformBetweenTargets(
    transformToAnimate,
    cloneTransform(transformToAnimate),
    endTransform,
    duration,
    easing,
    onUpdate
  )
}

const __fullProgress = { amt: 1 }
const __transformRegistry = new Map<TargetTransform, AnimatedObject<any>>()
function animateTransformBetweenTargets(
  transformToAnimate: TargetTransform,
  startTransform: TargetTransform,
  endTransform: TargetTransform,
  duration: number = 600,
  easing: NumberEaser = Easing.Quintic.Out,
  onUpdate?: (dt: number, p: number) => void
) {
  if (__transformRegistry.has(transformToAnimate)) {
    __transformRegistry.get(transformToAnimate)!.kill()
  }
  const target = { amt: 0 }
  const anim = simpleTweener.to({
    description: 'animateTransformBetweenTargets',
    target,
    propertyGoals: __fullProgress,
    duration,
    easing,
    onComplete: () => {
      copyTransform(transformToAnimate, endTransform)
      if (onUpdate) {
        onUpdate(1 / 60, 1)
      }
      __transformRegistry.delete(transformToAnimate)
    },
    onUpdate: (dt, p) => {
      transformToAnimate.position.lerpVectors(
        startTransform.position,
        endTransform.position,
        target.amt
      )
      transformToAnimate.quaternion
        .copy(startTransform.quaternion)
        .slerp(endTransform.quaternion, target.amt)
      transformToAnimate.scale.lerpVectors(
        startTransform.scale,
        endTransform.scale,
        target.amt
      )
      if (onUpdate) {
        onUpdate(dt, p)
      }
    }
  })
  __transformRegistry.set(transformToAnimate, anim)
  return anim
}
