import {
  BufferGeometry,
  Float32BufferAttribute,
  Sphere,
  Uint16BufferAttribute,
  Vector3
} from 'three'

export default class ScreenSpaceTriLineGeometry extends BufferGeometry {
  constructor() {
    super()
    const gridU = 2
    const gridV = 5

    const gridU1 = gridU + 1
    const gridV1 = gridV + 1

    const vertCount = gridU1 * gridV1
    const triangleCount = gridU * Math.ceil(gridV * 0.5) * 2
    const uvArr = new Float32Array(vertCount * 2)
    const offsetDataArr = new Float32Array(vertCount * 4)
    const indexArr = new Uint16Array(triangleCount * 3)

    const segment_width = 1 / gridU
    const segment_height = 1 / gridV

    let i2 = 0
    let i4 = 0
    const midGridV1 = gridV1 * 0.5
    // const offsetIndices = [0.1, 0.3, 0.6, 0.9]
    const offsetIndexLookup = [0, 0, 1]
    for (let iy = 0; iy < gridV1; iy++) {
      const y = iy * segment_height
      const offsetIndex = Math.abs(iy - midGridV1) + (iy < midGridV1 ? -1 : 0)
      const offset = offsetIndexLookup[offsetIndex]
      const direction = iy < midGridV1 ? -1 : 1
      const opacityLookup = 2 - offsetIndex
      for (let ix = 0; ix < gridU1; ix++) {
        const x = ix * segment_width

        offsetDataArr[i4] = offset
        offsetDataArr[i4 + 1] = direction
        offsetDataArr[i4 + 2] = opacityLookup
        offsetDataArr[i4 + 3] = ix

        uvArr[i2] = 1 - x
        uvArr[i2 + 1] = y
        i2 += 2
        i4 += 4
      }
    }

    let i6 = 0
    for (let iy = 0; iy < gridV; iy += 2) {
      for (let ix = 0; ix < gridU; ix++) {
        const a = ix + gridU1 * iy
        const b = ix + gridU1 * (iy + 1)
        const c = ix + 1 + gridU1 * (iy + 1)
        const d = ix + 1 + gridU1 * iy

        indexArr[i6] = a
        indexArr[i6 + 1] = b
        indexArr[i6 + 2] = d

        indexArr[i6 + 3] = b
        indexArr[i6 + 4] = c
        indexArr[i6 + 5] = d
        i6 += 6
      }
    }

    this.setIndex(new Uint16BufferAttribute(indexArr, 1))
    this.setAttribute(
      'offsetData',
      new Float32BufferAttribute(offsetDataArr, 4)
    )
    this.setAttribute('uv', new Float32BufferAttribute(uvArr, 2))
    this.boundingSphere = new Sphere(new Vector3(), 1000)
  }
}
