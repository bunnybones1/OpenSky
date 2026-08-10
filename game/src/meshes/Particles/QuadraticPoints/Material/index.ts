import { TextureAssetName } from '@opensky/shared/assets'
import { Color, IUniform, RawShaderMaterial, Uniform } from 'three'

import { getAssetsManager } from '~/assets/index'
import { blendModeParams, SupportedBlendMode } from '~/helpers/blendModeHelpers'
import { timeUniformFactory } from '~/timeUniforms'
import { renderMetricsUniforms } from '~/uniforms'
import { buildParameters } from '~/utils/jsUtils'

import fragmentShader from './frag.glsl'
import vertexShader from './vert.glsl'

export interface QuadraticPointMaterialParameters {
  colorTexture: TextureAssetName
  colorLightTop?: Color
  colorLightBottom?: Color
  distortionTexture?: TextureAssetName
  distortionScale?: number
  distortionStrength?: number
  distortionTaper?: boolean
  opacity: number
  blendMode: SupportedBlendMode
  speed: number
  dissipate?: boolean
  premultiplyAlpha?: boolean
  spriteSheetSegments?: number
  spriteSheetSpeed?: number
  flipX?: boolean
  flipY?: boolean
  easeSize?: boolean
  easeOpacity?: boolean
  alphaFromTexelRed?: boolean
  alphaTest?: number
  perspectiveScale?: boolean
  useUiScale?: boolean
  use2D?: boolean
}

const __defaultOptions: QuadraticPointMaterialParameters = {
  colorTexture: 'particle',
  blendMode: 'screen',
  opacity: 1.0,
  speed: 1.0,
  spriteSheetSpeed: 1.0,
  perspectiveScale: true
}

export default class Material extends RawShaderMaterial {
  // @ts-ignore ts(2611)
  set opacity(val: number) {
    if (this.uniforms && this.uniforms.opacity) {
      this.uniforms.opacity.value = val
    }
  }
  constructor(matOptions: Partial<QuadraticPointMaterialParameters>) {
    const matParams = buildParameters(__defaultOptions, matOptions)
    const opacity = new Uniform(matOptions.opacity)
    const timeUniform = timeUniformFactory.getUniform(matOptions.speed!)
    const uniforms: {
      [uniform: string]: IUniform<any>
    } = {
      colorTexture: getAssetsManager().getLazyTextureAssetUniform(
        matOptions.colorTexture!
      ),
      devicePixelRatio: matParams.useUiScale
        ? renderMetricsUniforms.finalUiPointScale
        : renderMetricsUniforms.finalPointScale,
      opacity,
      time: timeUniform
    }
    const defines: any = {}

    if (matParams.alphaTest !== undefined) {
      uniforms.alphaTest = new Uniform(matParams.alphaTest)
      defines.USE_ALPHA_TEST = true
    }
    if (matParams.distortionTexture) {
      uniforms.distortionTexture =
        getAssetsManager().getLazyTextureAssetUniform(
          matParams.distortionTexture
        )
      defines.USE_DISTORTION_TEXTURE = true
      uniforms.distortionScale = new Uniform(matParams.distortionScale)
      uniforms.distortionStrength = new Uniform(matParams.distortionStrength)
      if (matParams.distortionTaper) {
        defines.TAPER_DISTORTION = true
      }
    }
    if (matParams.dissipate) {
      defines.USE_DISSIPATE = true
    }

    if (matParams.perspectiveScale) {
      defines.USE_PERSPECTIVE_SCALE = true
    }

    if (matParams.use2D) {
      defines.USE_2D_MODE = true
    }

    if (matParams.blendMode === 'multiply' || matParams.premultiplyAlpha) {
      defines.PREMULTIPLY_ALPHA = true
    }

    if (matParams.colorLightTop && matParams.colorLightBottom) {
      defines.USE_LIGHT_COLORS = true
      uniforms.colorLightTop = new Uniform(matParams.colorLightTop)
      uniforms.colorLightBottom = new Uniform(matParams.colorLightBottom)
    }

    if (matParams.spriteSheetSegments !== undefined) {
      uniforms.spriteSheetSegments = new Uniform(matParams.spriteSheetSegments)
      uniforms.spriteSheetSpeed = new Uniform(
        matParams.spriteSheetSpeed! * matParams.speed
      )
      defines.USE_SPRITESHEET = true
    }

    if (matParams.flipX) {
      defines.FLIP_X = true
    }
    if (matParams.flipY) {
      defines.FLIP_Y = true
    }
    if (matParams.easeSize) {
      defines.EASE_SIZE = true
    }

    if (matParams.easeOpacity) {
      defines.EASE_OPACITY = true
    }
    if (matParams.alphaFromTexelRed) {
      defines.ALPHA_FROM_TEXEL_RED = true
    }

    super({
      vertexShader,
      fragmentShader,
      uniforms,
      ...blendModeParams[matParams.blendMode],
      defines
    })
  }
}
