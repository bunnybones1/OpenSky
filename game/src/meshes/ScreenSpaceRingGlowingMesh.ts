import { Mesh } from 'three'

import { hues } from '~/colors/colorHues'
import { makeHSL } from '~/colors/utils'
import ScreenSpaceRingGlowingMaterial, {
  ScreenSpaceRingGlowingMaterialOptions
} from '~/materials/ScreenSpaceRingGlowingMaterial'

import GlowingScreenSpaceRingGeometry from './geometry/GlowingScreenSpaceRingGeometry'

const __defaultOptions: ScreenSpaceRingGlowingMaterialOptions = {
  color: makeHSL(hues._12_coolCyan, 0.8, 0.5),
  radius: 20,
  innerThickness: 1,
  outerThickness: 16,
  innerOpacity: 1,
  outerOpacity: 0.3,
  progressSharpness: 6,
  constantSizeOnScreen: false,
  angle: 0,
  willNeedAngle: false,
  prescale: 1,
  transitionDuration: 2000
}

//TODO fix this geometry vvv
export default class ScreenSpaceRingGlowingMesh extends Mesh<
  GlowingScreenSpaceRingGeometry,
  ScreenSpaceRingGlowingMaterial
> {
  constructor(options: Partial<ScreenSpaceRingGlowingMaterialOptions>) {
    super(
      new GlowingScreenSpaceRingGeometry(),
      new ScreenSpaceRingGlowingMaterial({
        ...__defaultOptions,
        ...options
      })
    )
  }
}
