import { Color } from 'three'

import UpdateManager from '~/systems/UpdateManager'
import { standardTimeUniform, timeUniformFactory } from '~/timeUniforms'

let awesomeAnimatedColorBase: Color | undefined
const awesomeAnimatedStrengths: number[] = []
const awesomeAnimatedColors: Color[] = []

export function getAwesomeAnimatedColor(strength = 1) {
  if (!awesomeAnimatedColorBase) {
    const color = new Color(0.5, 0.5, 0.5)
    awesomeAnimatedColorBase = color
    const time = standardTimeUniform
    const time2 = timeUniformFactory.getUniform(0.3)
    UpdateManager.register({
      update: () => {
        const phase = time.value * Math.PI
        const phase2 = time2.value * Math.PI
        const s = Math.sin(phase2) * 0.25 + 0.25
        color.r = Math.sin(phase) * s + 0.5
        color.g = Math.sin(phase + 1) * s + 0.5
        color.b = Math.sin(phase + 2) * s + 0.5
        for (let i = 0; i < awesomeAnimatedStrengths.length; i++) {
          awesomeAnimatedColors[i]
            .setRGB(0.5, 0.5, 0.5)
            .lerp(color, awesomeAnimatedStrengths[i])
        }
      }
    })
  }
  if (awesomeAnimatedStrengths.indexOf(strength) === -1) {
    awesomeAnimatedStrengths.push(strength)
    awesomeAnimatedColors.push(awesomeAnimatedColorBase!.clone())
  }
  return awesomeAnimatedColors[awesomeAnimatedStrengths.indexOf(strength)]
}
