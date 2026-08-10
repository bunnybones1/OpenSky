import SimplexNoise from 'simplex-noise'
import {
  BufferGeometry,
  Float32BufferAttribute,
  Uint16BufferAttribute,
  Vector3
} from 'three'

import { Easing } from '~/systems/animation/Easing'

const expoIn = Easing.Exponential.In
const sineIn = Easing.Sinusoidal.In

function sfc32(a: number, b: number, c: number, d: number) {
  return function () {
    a >>>= 0
    b >>>= 0
    c >>>= 0
    d >>>= 0
    let t = (a + b) | 0
    a = b ^ (b >>> 9)
    b = (c + (c << 3)) | 0
    c = (c << 21) | (c >>> 11)
    d = (d + 1) | 0
    t = (t + d) | 0
    c = (c + t) | 0
    return (t >>> 0) / 4294967296
  }
}

export default class StarsGeometry extends BufferGeometry {
  constructor(
    total: number = 10000,
    radius: number = 80,
    sizeMin: number = 0.2,
    sizeMax: number = 1
  ) {
    super()
    const gen = sfc32(100, 200, 300, 444)
    function detRand(min = 0, max = 1) {
      return gen() * (max - min) + min
    }

    const vertex = new Vector3()
    const warp = new Vector3()
    const warpPrescale = 0.0002
    const warpPostscale = 0.2

    const simplexNoise = new SimplexNoise(detRand)

    // buffers

    const vertices = new Float32Array(total * 3)
    const sizes = new Float32Array(total)

    const galaxyNeighbourhoodScale = new Vector3(10000, 10000, 5000)
    function randomize() {
      vertex.set(
        detRand(-1, 1),
        detRand(-1, 1),
        sineIn(detRand()) * (detRand() > 0.5 ? 1 : -1)
      )
    }

    const sizeRange = sizeMax - sizeMin

    vertex.set(-1, -1, 1)
    vertex.multiply(galaxyNeighbourhoodScale)
    const maxDistance = vertex.length()

    for (let i = 0; i < total; i++) {
      randomize()
      while (vertex.length() > 1) {
        vertex.multiplyScalar(detRand())
      }

      vertex.multiply(galaxyNeighbourhoodScale)
      const distance = vertex.length()
      warp.set(
        simplexNoise.noise3D(
          vertex.x * warpPrescale,
          vertex.y * warpPrescale,
          vertex.z * warpPrescale
        ),
        simplexNoise.noise3D(
          vertex.y * warpPrescale,
          vertex.z * warpPrescale,
          vertex.x * warpPrescale
        ),
        simplexNoise.noise3D(
          vertex.z * warpPrescale,
          vertex.x * warpPrescale,
          vertex.y * warpPrescale
        )
      )
      vertex.normalize()
      warp.multiplyScalar(warpPostscale)
      vertex.add(warp)
      vertex.normalize()
      vertex.multiplyScalar(radius)
      vertex.toArray(vertices, i * 3)
      sizes[i] =
        (sizeMin + sizeRange * Math.pow(1 - distance / maxDistance, 2)) *
        (sizeMin + expoIn(detRand(0, 1)) * sizeRange)
    }

    // build geometry

    this.setAttribute('position', new Float32BufferAttribute(vertices, 3))
    this.setAttribute('size', new Float32BufferAttribute(sizes, 1))
    const indexArr = new Uint16Array(total)
    for (let i = 0; i < total; i++) {
      indexArr[i] = i
    }
    this.setIndex(new Uint16BufferAttribute(indexArr, 1, false))
  }
}
