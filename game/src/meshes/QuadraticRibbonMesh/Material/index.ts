import { TextureAssetName } from '@opensky/shared/assets'
import {
  DoubleSide,
  IUniform,
  RawShaderMaterial,
  Uniform,
  Vector2,
  Vector3,
  Vector4
} from 'three'

import { getAssetsManager } from '~/assets'
import { blendModeParams, SupportedBlendMode } from '~/helpers/blendModeHelpers'
import { time2UniformFactory } from '~/time2Uniforms'
import { renderMetricsUniforms } from '~/uniforms'
import { buildParameters } from '~/utils/jsUtils'

import fragmentShader from './frag.glsl'
import vertexShader from './vert.glsl'

export interface QuadraticRibbonMaterialParameters {
  color?: Vector4
  color2?: Vector4
  relativeWidth?: number
  blendMode?: SupportedBlendMode
  depthTest?: boolean
  depthWrite?: boolean
  positionStart?: Vector3
  positionHandle?: Vector3
  positionEnd?: Vector3
  textureName?: TextureAssetName
}

const __defaultOptions: QuadraticRibbonMaterialParameters = {
  blendMode: 'normalAlpha',
  color: new Vector4(1, 1, 1, 1),
  relativeWidth: 0.05,
  positionStart: new Vector3(-0.1, 0, 0),
  positionHandle: new Vector3(0, 0.1, 0),
  positionEnd: new Vector3(0.1, 0, 0),
  textureName: 'fireEffectSourceMap'
}

export default class Material extends RawShaderMaterial {
  private _uRelativeWidth: Uniform
  get relativeWidth(): number {
    return this._uRelativeWidth.value
  }
  set relativeWidth(value: number) {
    this._uRelativeWidth.value = value
  }
  constructor(matOptions: Partial<QuadraticRibbonMaterialParameters>) {
    const matParams = buildParameters(__defaultOptions, matOptions)

    const uRelativeWidth = new Uniform(matParams.relativeWidth)
    const uColor = new Uniform(matParams.color)
    const uPositionStart = new Uniform(matParams.positionStart)
    const uPositionHandle = new Uniform(matParams.positionHandle)
    const uPositionEnd = new Uniform(matParams.positionEnd)
    const uniforms: {
      [uniform: string]: IUniform<any>
    } = {
      uRelativeWidth,
      uPixelAspectRatio: renderMetricsUniforms.pixelAspectRatio,
      uColor,
      uPositionStart,
      uPositionHandle,
      uPositionEnd
    }
    const defines: any = {}

    if (matParams.color2) {
      uniforms.uColor2 = new Uniform(matParams.color2)
      defines.USE_COLOR2 = true
    }

    if (matParams.textureName) {
      uniforms.uTexture = getAssetsManager().getLazyTextureAssetUniform(
        matParams.textureName
      )
      const s = 0.2
      uniforms.uTime2 = time2UniformFactory.getUniform(0.75 * s, 1.5 * s)
      uniforms.uUniqueness = new Uniform(
        new Vector2(Math.random(), Math.random())
      )
      defines.USE_TEXTURE = true
    }
    if (matParams.blendMode === 'multiply') {
      defines.PREMULTIPLY_ALPHA = true
    }

    super({
      defines,
      vertexShader,
      fragmentShader,
      uniforms,
      side: DoubleSide,
      depthWrite: matParams.depthWrite,
      depthTest: matParams.depthTest,
      ...blendModeParams[matParams.blendMode!]
    })
    this._uRelativeWidth = uRelativeWidth
  }
}
