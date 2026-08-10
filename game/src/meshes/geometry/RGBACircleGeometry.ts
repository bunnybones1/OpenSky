import {
  Box3,
  BufferGeometry,
  Float32BufferAttribute,
  Sphere,
  Uint16BufferAttribute,
  Vector2,
  Vector3,
  Vector4
} from 'three'

import { blendColorsAndOpacitiesToVector4, makeHSL } from '~/colors/utils'
const __colorA = makeHSL(0, 0.8, 0.8)
const __colorB = makeHSL(0.4, 0.8, 0.8)
const __opacityA = 1
const __opacityB = 0
function __defaultColorMaker(uRatio: number, vRatio: number, outRGBA: Vector4) {
  blendColorsAndOpacitiesToVector4(
    __colorA,
    __colorB,
    __opacityA,
    __opacityB,
    vRatio,
    outRGBA
  )
}
export default class RGBACircleGeometry extends BufferGeometry {
  constructor(
    radius: number = 80,
    segsU: number = 32,
    segsV: number = 22,
    rgbaMaker = __defaultColorMaker,
    _uDistribution = (v: number) => v,
    vDistribution = (v: number) => 1 - Math.pow(1 - v, 3),
    cap = true
  ) {
    super()
    const verts = 1 + segsU * segsV

    const posArr = new Float32Array(verts * 2)
    const colorArr = new Float32Array(verts * 4)

    const pos = new Vector2(0, 0)
    pos.toArray(posArr, 0)
    const rgba = new Vector4()
    rgbaMaker(0, 0, rgba)
    rgba.toArray(colorArr, 0)
    let posIndex = 2
    let rgbaIndex = 4
    const segsVRaw = segsV - 1
    for (let iv = 0; iv < segsV; iv++) {
      const vRatioRaw = iv / segsVRaw
      const vRatio = vDistribution(vRatioRaw)
      const subRadius = vRatio * radius
      const twist = (iv * 0.5) / segsU
      for (let iu = 0; iu < segsU; iu++) {
        const angle = Math.PI * 2 * (iu / segsU - twist)

        pos.x = Math.cos(angle) * subRadius
        pos.y = Math.sin(angle) * subRadius
        pos.toArray(posArr, posIndex)

        rgbaMaker(iu / segsU, vRatioRaw, rgba)
        rgba.toArray(colorArr, rgbaIndex)

        posIndex += 2
        rgbaIndex += 4
      }
    }

    const indicesArr = new Uint16Array(3 * segsU * (segsV * 2 + (cap ? 1 : 0)))

    if (cap) {
      for (let i = 0; i < segsU; i++) {
        const i3 = i * 3
        indicesArr[i3] = 0
        indicesArr[i3 + 1] = (i % segsU) + 1
        indicesArr[i3 + 2] = ((i + 1) % segsU) + 1
      }
    }

    let iCounter = segsU
    for (let iv = 1; iv < segsV; iv++) {
      for (let iu = 0; iu < segsU; iu++) {
        const i3 = iCounter * 3
        const a = iv * segsU + iu + 1
        const b = iv * segsU + ((iu + 1) % segsU) + 1
        const c = a - segsU
        const d = b - segsU
        indicesArr[i3] = a
        indicesArr[i3 + 1] = b
        indicesArr[i3 + 2] = c
        indicesArr[i3 + 3] = d
        indicesArr[i3 + 4] = c
        indicesArr[i3 + 5] = b
        iCounter += 2
      }
    }
    const indicesAttr = new Uint16BufferAttribute(indicesArr, 1)
    this.setAttribute('color', new Float32BufferAttribute(colorArr, 4))
    this.setAttribute('position', new Float32BufferAttribute(posArr, 2))
    this.setIndex(indicesAttr)

    this.name = 'rgbaCircleGeometry'
    this.boundingSphere = new Sphere(new Vector3(), radius)
    this.boundingBox = new Box3(
      new Vector3(-radius, -radius, -radius),
      new Vector3(radius, radius, radius)
    )
  }
}
