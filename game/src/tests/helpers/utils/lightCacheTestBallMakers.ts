import {
  Color,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SphereBufferGeometry,
  Vector3
} from 'three'

import { makeHSL } from '~/colors/utils'

let __sphereGeo: SphereBufferGeometry | undefined
function __getSphereGeo() {
  if (!__sphereGeo) {
    __sphereGeo = new SphereBufferGeometry(1, 32, 16)
  }
  return __sphereGeo
}

function makeBall(radius: number, color: Color, physical = false) {
  const ball = new Mesh(
    __getSphereGeo(),
    physical
      ? new MeshStandardMaterial({
          color
        })
      : new MeshBasicMaterial({
          color
        })
  )
  ball.scale.multiplyScalar(radius)
  return ball
}
export function makeBallAt(
  pos: Vector3,
  radius: number = 0.01,
  color?: Color,
  physical = false
) {
  color = color || makeHSL(Math.random(), 0.8, 0.8)
  const ball = makeBall(radius, color, physical)
  ball.position.copy(pos)
  return { ball }
}
