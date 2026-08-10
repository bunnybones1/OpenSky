import {
  BufferGeometry,
  Float32BufferAttribute,
  Uint16BufferAttribute,
  Vector2,
  Vector3
} from 'three'

import { Easing } from '~/systems/animation/Easing'

import transformUVsIntoSubArea from '../utils/transformUVsIntoSubArea'

const quartIn = Easing.Quartic.In

export default class SunGeometry extends BufferGeometry {
  constructor(
    textureSize: Vector2,
    segsX: number = 16,
    segsY: number = 10,
    radius: number = 50,
    mapRow: number = 0,
    sunToHaloRatio: number = 0.1,
    phiStart: number = 0,
    phiLength: number = Math.PI * 2,
    thetaStart: number = 0,
    thetaLength: number = Math.PI * 0.2
  ) {
    super()

    this.type = 'SphereBufferGeometry'

    const thetaEnd = thetaStart + thetaLength

    let ix
    let iy

    let index = 0
    const grid = []

    const position = new Vector3()

    const totalPositions = (segsX + 1) * (segsY + 1)

    // buffers
    const positions = new Float32Array(totalPositions * 3)
    const uvs = new Float32Array(totalPositions * 2)

    // generate positions and uvs

    let countVerts = 0
    let countUvs = 0
    for (iy = 0; iy <= segsY; iy++) {
      const positionsRow = []

      const v = iy / segsY

      let v2 = quartIn(v)
      if (iy > 0) {
        v2 = sunToHaloRatio + v2 * (1 - sunToHaloRatio)
      }

      for (ix = 0; ix <= segsX; ix++) {
        const u = ix / segsX

        // position

        position.x =
          radius *
          Math.cos(phiStart + u * phiLength) *
          Math.sin(thetaStart + v2 * thetaLength)
        position.z = radius * Math.cos(thetaStart + v2 * thetaLength)
        position.y =
          radius *
          Math.sin(phiStart + u * phiLength) *
          Math.sin(thetaStart + v2 * thetaLength)

        position.toArray(positions, countVerts)
        countVerts += 3

        // uv

        uvs[countUvs++] = v
        uvs[countUvs++] = u

        positionsRow.push(index++)
      }

      grid.push(positionsRow)
    }

    // indices
    let countIndices = 0
    for (iy = 0; iy < segsY; iy++) {
      for (ix = 0; ix < segsX; ix++) {
        if (iy !== 0 || thetaStart > 0) {
          countIndices += 3
        }
        if (iy !== segsY - 1 || thetaEnd < Math.PI) {
          countIndices += 3
        }
      }
    }

    const indices = new Uint16Array(countIndices)
    countIndices = 0

    for (iy = 0; iy < segsY; iy++) {
      for (ix = 0; ix < segsX; ix++) {
        const a = grid[iy][ix + 1]
        const b = grid[iy][ix]
        const c = grid[iy + 1][ix]
        const d = grid[iy + 1][ix + 1]

        if (iy !== 0 || thetaStart > 0) {
          indices[countIndices++] = a
          indices[countIndices++] = b
          indices[countIndices++] = d
        }
        if (iy !== segsY - 1 || thetaEnd < Math.PI) {
          indices[countIndices++] = b
          indices[countIndices++] = c
          indices[countIndices++] = d
        }
      }
    }
    // build geometry
    this.setIndex(new Uint16BufferAttribute(indices, 1))
    this.setAttribute('position', new Float32BufferAttribute(positions, 3))
    const uvAttr = new Float32BufferAttribute(uvs, 2)
    this.setAttribute('uv', uvAttr)
    transformUVsIntoSubArea(
      uvAttr.array as Float32Array,
      textureSize,
      mapRow,
      mapRow + 1
    )
  }
}
