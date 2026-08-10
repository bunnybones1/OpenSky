import {
  Color,
  FrontSide,
  IUniform,
  MaterialParameters,
  RawShaderMaterial,
  ShaderMaterialParameters,
  Uniform,
  Vector4
} from 'three'

import { COLOR_WHITE } from '~/colors/colorLibrary'
import { testOverdraw } from '~/renderSettings'
import { copyDefaults } from '~/utils/jsUtils'
import { convertMaterialParamsToOverdrawTest } from '~/utils/materials'

import fragmentShader from './frag.glsl'
import vertexShader from './vert.glsl'

interface Options {
  color?: Color
  opacity?: number
  growWidth?: number
}

const __defaultMatOptions: Partial<MaterialParameters> = {
  side: FrontSide,
  transparent: false
}

const __defaultOptions: Partial<Options> = {
  color: COLOR_WHITE.clone(),
  opacity: 1
}

export default class BasicWidthBrightnessMeshMaterial extends RawShaderMaterial {
  private _options: Options
  private _matOptions: MaterialParameters
  private _RGBA: Vector4
  private _uGrowWidth: IUniform<number>
  set color(value: Color) {
    this._RGBA.x = value.r
    this._RGBA.y = value.g
    this._RGBA.z = value.b
  }
  get color(): never {
    throw new Error('cannot get color')
  }

  // @ts-ignore ts(2611)
  set opacity(value: number) {
    if (this._RGBA) {
      this._RGBA.w = value
    }
  }
  get opacity() {
    if (this._RGBA) {
      return this._RGBA.w
    } else {
      return 1
    }
  }
  constructor(options: Options = {}, matOptions: MaterialParameters = {}) {
    copyDefaults(options, __defaultOptions)
    copyDefaults(matOptions, __defaultMatOptions)
    const RGBA = new Vector4(
      options.color!.r,
      options.color!.g,
      options.color!.b,
      options.opacity!
    )
    const uRGBA = new Uniform(RGBA)
    const uGrowWidth = new Uniform(options.growWidth)
    const uniforms: {
      [uniform: string]: IUniform<any>
    } = {
      uRGBA,
      uGrowWidth
    }

    const params: ShaderMaterialParameters = {
      uniforms,
      vertexShader,
      fragmentShader,
      ...matOptions
    }

    if (testOverdraw.value) {
      convertMaterialParamsToOverdrawTest(params)
    }

    super(params)

    this._RGBA = RGBA
    this._uGrowWidth = uGrowWidth

    this._options = options
    this._matOptions = matOptions
  }
  get growWidth() {
    return this._uGrowWidth.value
  }
  set growWidth(val: number) {
    this._uGrowWidth.value = val
  }

  clone(): this {
    return new BasicWidthBrightnessMeshMaterial(
      this._options,
      this._matOptions
    ) as this
  }
  variant(
    options?: Partial<Options>,
    matParams?: Partial<MaterialParameters>
  ): this {
    return new BasicWidthBrightnessMeshMaterial(
      { ...this._options, ...options },
      { ...this._matOptions, ...matParams }
    ) as this
  }
}
