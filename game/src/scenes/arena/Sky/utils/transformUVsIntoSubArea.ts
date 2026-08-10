import { Vector2 } from 'three'

const transformUVsIntoSubArea = (
  uvs: Float32Array,
  textureSize: Vector2,
  mapFrameTop: number,
  mapFrameBottom: number
) => {
  //flipY
  mapFrameBottom = textureSize.y - mapFrameBottom
  mapFrameTop = textureSize.y - mapFrameTop

  const halfPixelOffset = new Vector2(0.5 / textureSize.x, 0.5 / textureSize.y)
  const mapFrameHeight = mapFrameTop - mapFrameBottom
  const adjustedFrameWidth = (textureSize.x - 1) / textureSize.x
  const adjustedFrameHeight = (mapFrameHeight - 1) / textureSize.y
  const topOffset = halfPixelOffset.y * (1 + 2 * mapFrameBottom)
  for (let i2 = 0; i2 < uvs.length; i2 += 2) {
    let u = uvs[i2]
    u *= adjustedFrameWidth
    u += halfPixelOffset.x
    uvs[i2] = u
    let v = uvs[i2 + 1]
    v *= adjustedFrameHeight
    v += topOffset
    uvs[i2 + 1] = v
  }
}

export default transformUVsIntoSubArea
