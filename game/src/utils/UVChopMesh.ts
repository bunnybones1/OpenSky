import { BufferGeometry, Float32BufferAttribute } from 'three'

import RectangleMaterial from '~/materials/RectangleMaterial'
import Mesh2D from '~/meshes/Mesh2D'

let __uvChopPlaneGeometry: BufferGeometry | undefined

function __getUvChopPlaneGeometry() {
  if (!__uvChopPlaneGeometry) {
    const geo = new BufferGeometry()

    geo.setIndex(
      // prettier-ignore
      [
        4, 0, 1,
        5, 4, 1,
        5, 1, 2,
        6, 5, 2,
        6, 2, 3,
        7, 6, 3
      ]
    )
    geo.setAttribute(
      'position',
      new Float32BufferAttribute(
        // // prettier-ignore
        // [
        //   -0.5, 0.5, 0,
        //   0, 0.5, 0,
        //   0, 0.5, 0,
        //   0.5, 0.5, 0,
        //   -0.5, -0.5, 0,
        //   0, -0.5, 0,
        //   0, -0.5, 0,
        //   0.5, -0.5,0
        // ],
        // prettier-ignore
        [
          0, -36, 0,
          18, -36, 0,
          18, -36, 0,
          36, -36, 0,
          0, 0, 0,
          18, 0, 0,
          18, 0, 0,
          36, 0, 0
        ],
        3
      )
    )
    const seamOffset = 0.02
    geo.setAttribute(
      'uv',
      new Float32BufferAttribute(
        // prettier-ignore
        [
          0,1,
          1 - seamOffset, 1,
          seamOffset, 0.5,
          1, 0.5,
          0, 0.5,
          1 - seamOffset, 0.5,
          seamOffset, 0,
          1, 0
        ],
        2
      )
    )
    geo.setAttribute(
      'uv2',
      new Float32BufferAttribute(
        // prettier-ignore
        [
          0, 1,
          0.5, 1,
          0.5, 1,
          1, 1,
          0, 0,
          0.5, 0,
          0.5, 0,
          1, 0
        ],
        2
      )
    )
    __uvChopPlaneGeometry = geo
  }
  return __uvChopPlaneGeometry
}

export default class UVChopMesh extends Mesh2D {
  constructor(public material: RectangleMaterial) {
    super(__getUvChopPlaneGeometry(), material)
    this.frustumCulled = false
  }
}
