import { SphereBufferGeometry, Vector2, Vector3 } from 'three'

import transformUVsIntoSubArea from '../utils/transformUVsIntoSubArea'

function expoOut(t: number) {
  return t === 1 ? 1 : -Math.pow(2, -10 * t) + 1
}
export default class SkyDomeGeometry extends SphereBufferGeometry {
  constructor(
    segsX: number = 32,
    segsY: number = 22,
    radius: number = 80,
    overHang: number = 0.2,
    horizonLine: number = 0.25,
    mapFrameTop: number = 0,
    mapFrameBottom: number = 4,
    textureSize: Vector2,
    warpOffset?: Vector3
  ) {
    const totalTheta = horizonLine + overHang
    const vRange = totalTheta / horizonLine
    super(radius, segsX, segsY, undefined, undefined, 0, Math.PI * totalTheta)
    const uvs = this.attributes.uv.array as Float32Array
    for (let i2 = 0; i2 < uvs.length; i2 += 2) {
      let u = uvs[i2]
      let v = uvs[i2 + 1]
      u = Math.abs(u - 0.5) * 2
      v = 1 - v
      v *= vRange
      const bottom = v > 1
      if (bottom) {
        v = 2 - v
      }
      v = 1 - v
      v = expoOut(v)
      if (bottom) {
        v *= 0.5
      }
      uvs[i2] = u
      uvs[i2 + 1] = v
    }

    const tempPos = new Vector3()
    if (warpOffset) {
      const posAttr = this.attributes.position
      const posArr = posAttr.array as Float32Array
      for (let i = 0; i < posAttr.count; i++) {
        const i3 = i * posAttr.itemSize
        tempPos.x = posArr[i3] + warpOffset.x
        tempPos.y = posArr[i3 + 1] + warpOffset.y
        tempPos.z = posArr[i3 + 2] + warpOffset.z
        tempPos.normalize().multiplyScalar(radius)
        posArr[i3] = tempPos.x
        posArr[i3 + 1] = tempPos.y
        posArr[i3 + 2] = tempPos.z
      }
    }

    transformUVsIntoSubArea(uvs, textureSize, mapFrameTop, mapFrameBottom)
    this.name = 'skyGeometry'
  }
}
