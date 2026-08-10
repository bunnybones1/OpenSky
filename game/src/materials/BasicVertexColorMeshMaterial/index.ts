import {
  Color,
  FrontSide,
  IUniform,
  MaterialParameters,
  RawShaderMaterial,
  ShaderMaterialParameters,
  Uniform,
  Vector2
} from 'three'

import { COLOR_WHITE } from '~/colors/colorLibrary'
import { testOverdraw } from '~/renderSettings'
import { AttributeRouter } from '~/utils/AttributeRouter'
import { copyDefaults } from '~/utils/jsUtils'
import { convertMaterialParamsToOverdrawTest } from '~/utils/materials'

import fragmentShader from './frag.glsl'
import vertexShader from './vert.glsl'

interface Options {
  color?: Color
  opacity?: number
  growMaskVertexAttribute?: string
  colorVertexAttribute?: string
  growSize?: Vector2
  prescale?: number
  originalAssetSize?: Vector2
}

const __defaultMatOptions: Partial<MaterialParameters> = {
  side: FrontSide,
  transparent: false
}

const __defaultOptions: Partial<Options> = {
  color: COLOR_WHITE.clone(),
  opacity: 1,
  originalAssetSize: new Vector2(36, 36),
  prescale: 1
}

export default class BasicVertexColorMeshMaterial extends RawShaderMaterial {
  private _size: Vector2
  private _options: Options
  private _matOptions: MaterialParameters
  private _colorUniform: Uniform
  private _opacityUniform: Uniform
  private _prescaleUniform?: Uniform
  set color(value: Color) {
    this._colorUniform.value = value
  }
  get color() {
    return this._colorUniform.value as Color
  }

  // @ts-ignore ts(2611)
  set opacity(value: number) {
    if (this._opacityUniform) {
      this._opacityUniform.value = value
    }
  }
  get opacity() {
    if (this._opacityUniform) {
      return this._opacityUniform.value as number
    } else {
      return 1
    }
  }
  constructor(options: Options = {}, matOptions: MaterialParameters = {}) {
    copyDefaults(options, __defaultOptions)
    copyDefaults(matOptions, __defaultMatOptions)
    const colorUniform = new Uniform(options.color)
    const opacityUniform = new Uniform(options.opacity)
    const uniforms: {
      [uniform: string]: IUniform<any>
    } = {
      uColor: colorUniform,
      uOpacity: opacityUniform
    }

    const attributes = new AttributeRouter([
      options.growMaskVertexAttribute,
      options.colorVertexAttribute
    ])
    let vertexShaderPreamble = ''

    const defines: any = {}

    if (options.colorVertexAttribute) {
      defines.COLOR_ATTRIBUTE = attributes.correct(
        options.colorVertexAttribute!
      )
      defines.COLOR_ATTRIBUTE_HAS_ALPHA =
        defines.COLOR_ATTRIBUTE.split('.')[1].length === 4
    }

    const uPrescale = new Uniform(options.prescale)

    if (options.growMaskVertexAttribute) {
      options.growSize = options.growSize?.clone() || new Vector2()
      defines.GROW_MASK_ATTRIBUTE = attributes.correct(
        options.growMaskVertexAttribute!
      )
      uniforms.uGrowSize = new Uniform(options.growSize)
      uniforms.uPrescale = uPrescale
      uniforms.uOriginalAssetSize = new Uniform(options.originalAssetSize)
    }

    vertexShaderPreamble += attributes.getVertexPreamble()
    const params: ShaderMaterialParameters = {
      defines,
      uniforms,
      vertexShader: vertexShaderPreamble + vertexShader,
      fragmentShader,
      ...matOptions
    }

    if (testOverdraw.value) {
      convertMaterialParamsToOverdrawTest(params)
    }

    super(params)

    if (options.growMaskVertexAttribute) {
      this._size = options.growSize!
    }

    this._colorUniform = colorUniform
    this._opacityUniform = opacityUniform
    this._prescaleUniform = uPrescale

    this._options = options
    this._matOptions = matOptions
  }
  get size() {
    return this._size
  }
  set size(val: Vector2) {
    if (val) {
      this._options.growSize = val
      this._size = val
      this.uniforms.uGrowSize.value = val
    }
  }
  setSize(width: number, height: number) {
    if (this._size) {
      this._size.set(width, height)
    }
  }

  setPrescale(scale: number) {
    if (this._prescaleUniform) {
      this._prescaleUniform.value = scale
    }
  }

  clone(): this {
    return new BasicVertexColorMeshMaterial(
      this._options,
      this._matOptions
    ) as this
  }
  variant(
    options?: Partial<Options>,
    matParams?: Partial<MaterialParameters>
  ): this {
    return new BasicVertexColorMeshMaterial(
      { ...this._options, ...options },
      { ...this._matOptions, ...matParams }
    ) as this
  }
}
