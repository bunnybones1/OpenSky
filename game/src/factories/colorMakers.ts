import { ColorMaker } from '~/meshes/Particles/ColorMaker'

type supportedColorMakers = 'fire' | 'spark' | 'armorArc' | 'fullWhite'

const colorMakers: {
  [K in supportedColorMakers]: ColorMaker
} = {
  spark(i, outColor, side = 0) {
    outColor
      .setHSL(
        // Math.cos(i / 800) * 0.25 + (((iSnap + 1) % 4 > 1) ? 0.25 : -0.25) + (side > 0 ? 0.06125 : 0.0),
        Math.sin(i / 10) * 0.125 + (side > 0 ? 0.06125 : 0.0) + 0.1,
        0.7,
        0.2
      )
      .multiplyScalar(4.0)
  },
  fire(i, outColor, side = 0) {
    outColor
      .setHSL(
        // Math.cos(i / 800) * 0.25 + (((iSnap + 1) % 4 > 1) ? 0.25 : -0.25) + (side > 0 ? 0.06125 : 0.0),
        Math.sin(i / 10) * 0.0125 + (side > 0 ? 0.06125 : 0.0) + 0.1,
        0.7,
        0.2
      )
      .multiplyScalar(4.0)
  },
  armorArc(i, outColor, side = 0) {
    outColor
      .setHSL(
        // Math.cos(i / 800) * 0.25 + (((iSnap + 1) % 4 > 1) ? 0.25 : -0.25) + (side > 0 ? 0.06125 : 0.0),
        Math.sin(i / 10) * 0.0125 + (side > 0 ? 0.06125 : 0.0) + 0.625,
        0.7,
        0.2
      )
      .multiplyScalar(4.0)
  },
  fullWhite(_i, outColor) {
    outColor.setRGB(1, 1, 1)
  }
}
export default colorMakers
