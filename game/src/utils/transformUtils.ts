import { closeEnough } from '@opensky/shared/utils/math'
import { Matrix4, Object3D, Quaternion, Vector3 } from 'three'

import { type TargetTransform } from '~/systems/animation/transform'

export function vector3CloseEnough(pos: Vector3, pos2: Vector3) {
  return (
    closeEnough(pos.x, pos2.x) &&
    closeEnough(pos.y, pos2.y) &&
    closeEnough(pos.z, pos2.z)
  )
}

export function quaternionCloseEnough(quat: Quaternion, quat2: Quaternion) {
  return (
    closeEnough(quat.x, quat2.x) &&
    closeEnough(quat.y, quat2.y) &&
    closeEnough(quat.z, quat2.z) &&
    closeEnough(quat.w, quat2.w)
  )
}

export function transformsCloseEnough(
  t1: TargetTransform,
  t2: TargetTransform
) {
  return (
    vector3CloseEnough(t1.position, t2.position) &&
    vector3CloseEnough(t1.scale, t2.scale) &&
    quaternionCloseEnough(t1.quaternion, t2.quaternion)
  )
}

export function copyTransform(
  target: TargetTransform,
  transform: TargetTransform
) {
  target.position.copy(transform.position)
  target.scale.copy(transform.scale)
  target.quaternion.copy(transform.quaternion)
}

export function cloneTransform(
  transform: TargetTransform | Object3D
): TargetTransform {
  return {
    position: transform.position.clone(),
    quaternion: transform.quaternion.clone(),
    scale: transform.scale.clone()
  }
}

type TM = {
  matrixWorld: Matrix4
}

export function copyTransformMatrixWorld(
  target: TargetTransform,
  transform: TM
) {
  if (transform.matrixWorld) {
    transform.matrixWorld.decompose(
      target.position,
      target.quaternion,
      target.scale
    )
  } else {
    throw new Error('transform needs a matrixWorld')
  }
}

export function copyTransformMatrix(
  target: TargetTransform,
  transform: TargetTransform
) {
  if (transform.matrix) {
    transform.matrix.decompose(target.position, target.quaternion, target.scale)
  } else {
    throw new Error('transform needs a matrix')
  }
}

export function copyTransformWithMatrix(
  target: Object3D,
  transform: TargetTransform
) {
  target.position.copy(transform.position)
  target.scale.copy(transform.scale)
  target.quaternion.copy(transform.quaternion)
  target.updateMatrix()
}

export function resetTransform(node: Object3D) {
  node.position.set(0, 0, 0)
  node.rotation.set(0, 0, 0)
  node.scale.set(1, 1, 1)
}

export function distanceBetweenTransforms(
  ta: TargetTransform,
  tb: TargetTransform
) {
  return ta.position.distanceTo(tb.position)
}
