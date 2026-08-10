import { lerp, rand } from '@opensky/shared/utils/math'
import {
  BufferGeometry,
  Float32BufferAttribute,
  Uint16BufferAttribute,
  Vector2
} from 'three'

import { Easing } from '~/systems/animation/Easing'

export default class FireworksGeometry extends BufferGeometry {
  constructor(
    total: number = 10000,
    radius: number = 200,
    sizeMin: number = 2,
    sizeMax: number = 7,
    duration: number = 1000,
    gravity: number = 1000
  ) {
    super()

    const vertex = new Vector2()

    // buffers
    const positions = new Float32Array(total * 4)
    const sizes = new Float32Array(total)
    const speeds = new Float32Array(total)

    vertex.set(-1, -1)

    function addPoint(
      arr: Float32Array,
      index: number,
      x: number,
      y: number,
      z: number,
      w: number
    ) {
      arr[index] = x
      arr[index + 1] = y
      arr[index + 2] = z
      arr[index + 3] = w
    }

    const dropOverTime = 0.5 * gravity * Math.pow(duration / 1000, 2)
    for (let i = 0; i < total; i++) {
      const positionIdx = i * 4

      vertex.set(rand(-1, 1), rand(-1, 1)) // Random in Cube shape
      vertex.normalize() // Normalize to create random unit sphere
      vertex.multiplyScalar(radius * Math.pow(rand(), 0.5)) // Scale by radius

      addPoint(
        positions,
        positionIdx,
        vertex.x,
        vertex.y,
        vertex.x,
        vertex.y + dropOverTime
      )

      sizes[i] = lerp(sizeMin, sizeMax, Easing.Exponential.In(Math.random()))
      speeds[i] = Math.random()
    }

    // Build geometry
    this.setAttribute('positions', new Float32BufferAttribute(positions, 4))
    this.setAttribute('size', new Float32BufferAttribute(sizes, 1))
    this.setAttribute('speed', new Float32BufferAttribute(speeds, 1))

    const indicesArr = new Uint16Array(total)

    for (let i = 0; i < total; i++) {
      indicesArr[i] = i
    }

    this.index = new Uint16BufferAttribute(indicesArr, 1)
  }
}
