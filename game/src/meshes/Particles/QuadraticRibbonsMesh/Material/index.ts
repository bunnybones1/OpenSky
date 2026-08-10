import { TextureAssetName } from '@opensky/shared/assets'
import { renderMetrics } from '@opensky/shared/renderMetrics'
import { listenToProperty } from '@opensky/shared/utils/propertyListeners'
import {
  Color,
  DoubleSide,
  IUniform,
  RawShaderMaterial,
  Uniform,
  Vector2
} from 'three'

import { getAssetsManager } from '~/assets/index'
import { blendModeParams, SupportedBlendMode } from '~/helpers/blendModeHelpers'
import { EaseKitName, easeKits } from '~/helpers/easeKits'
import { timeUniformFactory } from '~/timeUniforms'
import { renderMetricsUniforms } from '~/uniforms'
import { buildParameters } from '~/utils/jsUtils'

import fragmentShader from './frag.glsl'
import vertexShader from './vert.glsl'

export interface QuadraticRibbonsMaterialParameters {
  trianglesPerRibbonShared: number
  colorTexture?: TextureAssetName
  color?: Color
  colorEnd?: Color
  opacity: number
  relativeWidth: number
  uiScaleRelativeWidth?: boolean
  blendMode: SupportedBlendMode
  distortionTexture?: TextureAssetName
  distortionScale?: number
  distortionStrength?: number
  distortionTaper?: 'in' | 'out' | 'inout' | 'none'
  quantizeVertsAlongTime: boolean
  timeEase?: EaseKitName
  shapeEase?: EaseKitName
  strokePathFraction: number
  speed: number
  taperRibbonOut?: boolean
  useColorOverTime?: boolean
  premultiplyAlpha?: boolean
  useColorOverOpacity?: boolean
  sineWaveScaleStrength?: Vector2
  useTimeRewind?: boolean
  progressLock?: number
  depthTest?: boolean
  use2D?: boolean
}

const __defaultOptions: QuadraticRibbonsMaterialParameters = {
  blendMode: 'screen',
  relativeWidth: 0.05,
  quantizeVertsAlongTime: false,
  strokePathFraction: 1.0,
  opacity: 1.0,
  speed: 1.0,
  distortionScale: 0.2,
  distortionStrength: 0.2,
  distortionTaper: 'in',
  taperRibbonOut: false,
  useColorOverTime: false,
  useColorOverOpacity: false,
  trianglesPerRibbonShared: 2,
  depthTest: true,
  use2D: false
}

export default class Material extends RawShaderMaterial {
  // @ts-ignore ts(2611)
  set opacity(val: number) {
    if (this.uniforms && this.uniforms.opacity) {
      this.uniforms.opacity.value = val
    }
  }

  constructor(matOptions: Partial<QuadraticRibbonsMaterialParameters>) {
    const matParams = buildParameters(__defaultOptions, matOptions)

    const lengthVertsPerStroke =
      Math.ceil(matParams.trianglesPerRibbonShared * 0.5) + 1
    const fullLengthVerts = new Uniform(
      lengthVertsPerStroke / matParams.strokePathFraction
    )

    const opacity = new Uniform(matParams.opacity)
    const progress = timeUniformFactory.getUniform(matParams.speed)
    const relativeWidth = new Uniform(matParams.relativeWidth)
    if (matParams.uiScaleRelativeWidth) {
      listenToProperty(renderMetrics, 'uiHeight', h => {
        relativeWidth.value = matParams.relativeWidth * (1080 / h)
      })
    }
    const uniforms: {
      [uniform: string]: IUniform<any>
    } = {
      relativeWidth,
      strokePathFraction: new Uniform(matParams.strokePathFraction),
      pixelAspectRatio: renderMetricsUniforms.pixelAspectRatio,
      opacity,
      progress,
      fullLengthVerts
    }
    const defines: any = {}
    let preamble = ''
    if (matParams.colorTexture) {
      uniforms.colorTexture = getAssetsManager().getLazyTextureAssetUniform(
        matParams.colorTexture
      )
      defines.USE_COLOR_TEXTURE = true
    }
    if (matParams.color) {
      uniforms.uColor = new Uniform(matParams.color)
      defines.USE_COLOR = true
      if (matParams.colorEnd) {
        uniforms.uColorEnd = new Uniform(matParams.colorEnd)
        defines.USE_COLOR_END = true
      }
      if (matParams.useColorOverTime) {
        defines.USE_COLOR_OVER_TIME = true
      }
      if (matParams.useColorOverOpacity) {
        defines.USE_COLOR_OVER_OPACITY = true
      }
    }
    if (matParams.use2D) {
      defines.USE_2D_MODE = true
    }
    if (matParams.distortionTexture) {
      uniforms.distortionTexture =
        getAssetsManager().getLazyTextureAssetUniform(
          matParams.distortionTexture
        )
      defines.USE_DISTORTION_TEXTURE = true
      uniforms.distortionScale = new Uniform(matParams.distortionScale)
      uniforms.distortionStrength = new Uniform(matParams.distortionStrength)
      if (matParams.distortionTaper === 'in') {
        defines.TAPER_DISTORTION_IN = true
      } else if (matParams.distortionTaper === 'out') {
        defines.TAPER_DISTORTION_OUT = true
      } else if (matParams.distortionTaper === 'inout') {
        defines.TAPER_DISTORTION_IN_OUT = true
      }
    }
    if (matParams.quantizeVertsAlongTime) {
      defines.QUANTIZE_TIME = true
    }

    if (matParams.timeEase) {
      defines.TIME_EASE = true
      preamble +=
        easeKits[matParams.timeEase].glsl.replace('ease', 'timeEase') + '\n'
    }

    if (matParams.shapeEase) {
      defines.SHAPE_EASE = true
      preamble +=
        easeKits[matParams.shapeEase].glsl.replace('ease', 'shapeEase') + '\n'
    }

    if (matParams.taperRibbonOut) {
      defines.TAPER_RIBBON_OUT = true
    }

    if (matParams.sineWaveScaleStrength) {
      defines.USE_SINE_WAVE = true
      uniforms.uSineWaveScaleStrength = new Uniform(
        matParams.sineWaveScaleStrength
      )
    }

    if (matParams.blendMode === 'multiply' || matParams.premultiplyAlpha) {
      defines.PREMULTIPLY_ALPHA = true
    }

    if (matParams.useTimeRewind) {
      defines.USE_TIME_REWIND = true
    }

    if (matParams.progressLock !== undefined) {
      defines.PROGRESS_LOCK = matParams.progressLock
    }

    super({
      defines,
      vertexShader: preamble + vertexShader,
      fragmentShader,
      uniforms,
      side: DoubleSide,
      ...blendModeParams[matParams.blendMode],
      depthWrite: false,
      depthTest: matParams.depthTest
    })
  }
}
