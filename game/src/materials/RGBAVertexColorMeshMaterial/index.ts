import {
  Color,
  FrontSide,
  IUniform,
  MaterialParameters,
  RawShaderMaterial,
  ShaderMaterialParameters,
  Uniform
} from 'three'

import { blendModeParams, SupportedBlendMode } from '~/helpers/blendModeHelpers'
import { testOverdraw } from '~/renderSettings'
import { aspectRatioUniform } from '~/uniforms'
import { buildParameters, copyDefaults } from '~/utils/jsUtils'
import { convertMaterialParamsToOverdrawTest } from '~/utils/materials'

import fragmentShader from './frag.glsl'
import vertexShader from './vert.glsl'

interface Options {
  blendMode?: SupportedBlendMode
  opacity?: number
  screenspaceMode?: boolean
  premultiplyAlpha?: boolean
  color?: Color
}

const __defaultMatOptions: Partial<MaterialParameters> = {
  side: FrontSide,
  transparent: true
}

const __defaultOptions: Partial<Options> = {
  opacity: 1
}

export default class RGBAVertexColorMeshMaterial extends RawShaderMaterial {
  // @ts-ignore ts(2611)
  set opacity(val: number) {
    if (this.uniforms && this.uniforms.uOpacity) {
      this.uniforms.uOpacity.value = val
    }
  }
  get opacity() {
    if (this.uniforms && this.uniforms.uOpacity) {
      return this.uniforms.uOpacity.value
    }
    return 0
  }
  private _options: Options
  private _matOptions: MaterialParameters
  constructor(options: Options = {}, matOptions: MaterialParameters = {}) {
    const params = buildParameters(__defaultOptions, options)
    const matParams = buildParameters(__defaultMatOptions, matOptions)
    const uniforms: {
      [uniform: string]: IUniform<any>
    } = {
      uOpacity: new Uniform(params.opacity)
    }

    const vertexShaderPreamble = ''

    const defines: any = {}

    if (params.blendMode === 'multiply' || params.premultiplyAlpha) {
      defines.PREMULTIPLY_ALPHA = true
    }
    if (params.blendMode) {
      copyDefaults(matParams, blendModeParams[params.blendMode])
    }
    if (params.color) {
      defines.USE_COLOR = true
      uniforms.uColor = new Uniform(params.color)
    }

    if (params.screenspaceMode) {
      defines.USE_2D_MODE = true
      uniforms.uAspectRatio = aspectRatioUniform
    }

    const parameters: ShaderMaterialParameters = {
      defines,
      uniforms,
      vertexShader: vertexShaderPreamble + vertexShader,
      fragmentShader,
      ...matParams
    }

    if (testOverdraw.value) {
      convertMaterialParamsToOverdrawTest(parameters)
    }

    super(parameters)

    this._options = options
    this._matOptions = matOptions
  }
  clone(): this {
    return new RGBAVertexColorMeshMaterial(
      this._options,
      this._matOptions
    ) as this
  }
}
