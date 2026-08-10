import {
  BufferGeometry,
  Float32BufferAttribute,
  Uint16BufferAttribute
} from 'three'

import { buildParameters } from '~/utils/jsUtils'

function __defaultWidthLookup(_ratio: number) {
  return 1
}

interface QuadraticRibbonGeometryParameters {
  totalVerts: number
  widthLookup: (ratio: number) => number
}

const __defaultQuadraticRibbonGeometryParameters: QuadraticRibbonGeometryParameters =
  {
    totalVerts: 100,
    widthLookup: __defaultWidthLookup
  }

export default class QuadraticRibbonGeometry extends BufferGeometry {
  totalVerts: number
  totalTriangles: number
  totalIndices: number
  constructor(options: Partial<QuadraticRibbonGeometryParameters>) {
    super()

    const params = buildParameters(
      __defaultQuadraticRibbonGeometryParameters,
      options
    )
    const { widthLookup } = params

    const totalVerts = params.totalVerts
    this.totalVerts = totalVerts
    const totalTriangles = params.totalVerts - 2
    this.totalTriangles = totalTriangles
    this.totalIndices = totalTriangles * 3

    const ratioSide = new Float32Array(totalVerts * 2)
    const indices = new Uint16Array(this.totalIndices)

    const correcter = ~~(totalVerts * 0.5) - 1
    const correction = 1 + 1 / correcter

    for (let i = 0; i < totalVerts; i++) {
      const i2 = i * 2
      const iSnap = 2 * Math.floor(i * 0.5)
      const side = (i % 2) * 2 - 1
      const ratio = (iSnap / totalVerts) * correction
      const width = widthLookup(ratio)
      ratioSide[i2] = ratio
      ratioSide[i2 + 1] = side * width
    }

    for (let i = 0; i < totalTriangles; i++) {
      const i3 = i * 3
      indices[i3] = i
      indices[i3 + 1] = i + 1
      indices[i3 + 2] = i + 2
    }

    this.setAttribute('ratioSide', new Float32BufferAttribute(ratioSide, 2))
    this.setIndex(new Uint16BufferAttribute(indices, 1))
  }
}
