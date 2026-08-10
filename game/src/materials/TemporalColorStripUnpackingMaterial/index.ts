import {
  Color,
  FrontSide,
  IUniform,
  RawShaderMaterial,
  Side,
  Texture,
  Uniform,
  Vector3
} from 'three'

import fragmentShader from './frag.glsl'
import vertexShader from './vert.glsl'

interface IDefines {
  USE_INV_GAMMA_COLOR?: true
}

export default class TemporalColorStripUnpackingMaterial extends RawShaderMaterial {
  updateProgress: (progress: number) => void
  constructor(
    mapTexture: Texture,
    mapFrameHeight: number = 5,
    mapFrames: number = 48,
    mapTotalHeight: number = 256,
    side: Side = FrontSide,
    invGammaColor?: Color
  ) {
    const xVA_yVB_zMix = new Vector3()
    const uniforms: {
      [uniform: string]: IUniform<any>
    } = {
      mapTexture: new Uniform(mapTexture),
      xVA_yVB_zMix: new Uniform(xVA_yVB_zMix)
    }
    const defines: IDefines = {}

    if (invGammaColor) {
      uniforms.invGammaColor = new Uniform(invGammaColor)
      defines.USE_INV_GAMMA_COLOR = true
    }

    super({
      vertexShader,
      fragmentShader,
      defines,
      uniforms,
      side
    })

    const totalMapFrames: number = mapTotalHeight / mapFrameHeight
    const usedFramesPercentage: number = mapFrames / totalMapFrames
    const frameRatio = 1.0 / mapFrames

    this.updateProgress = (progress: number) => {
      const remainder = progress % frameRatio
      const quantizedProgress = progress - remainder
      const inverseUsedFramesPercentage = 1.0 - usedFramesPercentage
      const vA =
        quantizedProgress * usedFramesPercentage + inverseUsedFramesPercentage
      const quantizedProgress2 = quantizedProgress + frameRatio
      const vB =
        (quantizedProgress2 % 1.0) * usedFramesPercentage +
        inverseUsedFramesPercentage
      const vMix = (progress - quantizedProgress) * mapFrames
      xVA_yVB_zMix.x = vA
      xVA_yVB_zMix.y = vB
      xVA_yVB_zMix.z = vMix
      // this.uniformsNeedUpdate = true
    }
  }
  set progress(value: number) {
    this.updateProgress(value)
  }
  get progress(): number {
    return this.uniforms.progress.value
  }
}
