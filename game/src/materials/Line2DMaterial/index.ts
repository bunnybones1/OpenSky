import {
  Color,
  IUniform,
  MaterialParameters,
  RawShaderMaterial,
  ShaderMaterialParameters,
  Uniform
} from 'three'

import { UI_DEFAULT_DEPTH } from '~/helpers/I2D'
import { IDepthMaterial2D } from '~/meshes/Mesh2D'
import { testOverdraw } from '~/renderSettings'
import { buildParameters } from '~/utils/jsUtils'
import { convertMaterialParamsToOverdrawTest } from '~/utils/materials'

import fragmentShader from './frag.glsl'
import vertexShader from './vert.glsl'

interface Options {
  color?: Color
  depth?: number
}

const __defaultMatOptions: Partial<MaterialParameters> = {
  transparent: true,
  depthWrite: false,
  depthTest: true
}

const __defaultOptions: Partial<Options> = {
  color: new Color(0.9, 0.6, 0.1),
  depth: UI_DEFAULT_DEPTH
}

export default class Line2DMaterial
  extends RawShaderMaterial
  implements IDepthMaterial2D
{
  private _options: Options
  private _matOptions: MaterialParameters
  private _colorUniform: Uniform
  private _depth: number
  private _depthOffset: number

  constructor(options: Options = {}, matOptions: MaterialParameters = {}) {
    const params = buildParameters(__defaultOptions, options)
    const matParams = buildParameters(__defaultMatOptions, matOptions)
    const uColor = new Uniform(params.color!)
    const uDepth = new Uniform(params.depth!)
    const uniforms: {
      [uniform: string]: IUniform<any>
    } = {
      uColor,
      uDepth
    }

    const defines: Partial<{
      FANCY_HIGHLIGHT: string
    }> = {}

    const materialParams: ShaderMaterialParameters = {
      defines,
      uniforms,
      vertexShader: vertexShader,
      fragmentShader,
      ...matParams
    }

    if (testOverdraw.value) {
      convertMaterialParamsToOverdrawTest(materialParams)
    }

    super(materialParams)

    this._depth = params.depth!
    this._colorUniform = uColor
    this._depthOffset = 0
    this._options = options
    this._matOptions = matOptions
  }

  get depth() {
    return this._depth
  }
  set depth(value: number) {
    this._depth = value
    this.uniforms.uDepth.value = this._depthOffset + this._depth
  }
  getFinalDepth() {
    return this.uniforms.uDepth.value
  }
  get depthOffset() {
    return this._depthOffset
  }
  set depthOffset(value: number) {
    this._depthOffset = value
    this.uniforms.uDepth.value = this._depthOffset + this._depth
  }

  setColor(color: Color) {
    this._colorUniform.value = color
  }

  clone(): this {
    return new Line2DMaterial(this._options, this._matOptions) as this
  }
  variant(
    options?: Partial<Options>,
    matOptions?: Partial<MaterialParameters>
  ): this {
    return new Line2DMaterial(
      { ...this._options, ...options },
      { ...this._matOptions, ...matOptions }
    ) as this
  }
}
