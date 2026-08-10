import { Object3D, Vector3 } from 'three'

import { WorldPointObject3D } from './WorldPointObject3D'

export function makeWorldPointAt(
  parent: Object3D,
  x: number,
  y: number,
  z: number
) {
  const obj = new WorldPointObject3D()
  obj.position.set(x, y, z)
  parent.add(obj)
  return obj
}

export function makeWorldAveragePositionBetween(
  a: WorldPointObject3D,
  b: WorldPointObject3D,
  offsetX = 0,
  offsetY = 0,
  offsetZ = 0
) {
  const ap = a.worldPosition
  const bp = b.worldPosition
  const position = new Vector3(0, 0, 0)
  const onBeforeRender = () => {
    position.x = (ap.x + bp.x) * 0.5 + offsetX
    position.y = (ap.y + bp.y) * 0.5 + offsetY
    position.z = (ap.z + bp.z) * 0.5 + offsetZ
  }
  return { position, onBeforeRender }
}
