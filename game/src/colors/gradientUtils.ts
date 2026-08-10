import Gradient from './Gradient'
import { MetaColorParameter } from './types'

function toGradient(value: MetaColorParameter) {
  return value instanceof Gradient
    ? value
    : new Gradient({ top: value, bottom: value })
}

export function toVertexColors(value: MetaColorParameter) {
  const gradientColor = toGradient(value || 0xffffff)

  return {
    topLeft: gradientColor.topLeft.toArray(),
    topRight: gradientColor.topRight.toArray(),
    bottomLeft: gradientColor.bottomLeft.toArray(),
    bottomRight: gradientColor.bottomRight.toArray()
  }
}
