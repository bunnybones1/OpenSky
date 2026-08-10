import {
  Color,
  IUniform,
  MaterialParameters,
  RawShaderMaterial,
  ShaderMaterialParameters,
  Texture,
  Uniform
} from 'three'

import { UI_DEFAULT_DEPTH } from '~/helpers/I2D'
import { testOverdraw } from '~/renderSettings'
import UpdateManager from '~/systems/UpdateManager'
import { standardTimeUniform } from '~/timeUniforms'
import { buildParameters } from '~/utils/jsUtils'
import { convertMaterialParamsToOverdrawTest } from '~/utils/materials'
import { getTempTexture } from '~/utils/tempTexture'

import fragmentShader from './frag.glsl'
import vertexShader from './vert.glsl'

interface ManaVialMeshMaterialParameters {
  map: Texture
  supportOpacity?: boolean
  overlayColor?: Color
  depth?: number
}

const __defaults: ManaVialMeshMaterialParameters = {
  map: getTempTexture(),
  supportOpacity: false
}

export default class ManaVialMeshMaterial extends RawShaderMaterial {
  private _mapTextureUniform: Uniform
  private _overlayColorUniform: Uniform
  private _colorLiquidTop: Color
  private _colorLiquidTopBase: Color
  private _fillPercentage: number
  private _uDepth: Uniform
  private _depth: number
  private _depthOffset: number
  get depth(): number {
    return this._depth
  }
  set depth(value: number) {
    this._depth = value
    this._uDepth.value = this._depth + this._depthOffset
  }
  get depthOffset(): number {
    return this._depthOffset
  }
  set depthOffset(value: number) {
    this._depthOffset = value
    this._uDepth.value = this._depth + this._depthOffset
  }
  getFinalDepth() {
    return this._uDepth.value
  }
  get fillPercentage(): number {
    return this._fillPercentage
  }
  set fillPercentage(value: number) {
    this._fillPercentage = value
  }
  private _options: ManaVialMeshMaterialParameters
  private _matOptions: Partial<MaterialParameters>
  constructor(
    options: ManaVialMeshMaterialParameters,
    matOptions: Partial<MaterialParameters> = {}
  ) {
    const params = buildParameters(__defaults, options)
    const mapTexture = new Uniform(params.map)

    const colorLiquidTop = new Color(1, 1, 1)
    const colorLiquidTopBase = new Color(0.85, 0.8, 0.9)
    const uDepth = new Uniform(params.depth ?? UI_DEFAULT_DEPTH)
    const uniforms: { [uniform: string]: IUniform<any> } = {
      mapTexture,
      heightLeft: new Uniform(0.5),
      heightRight: new Uniform(0.5),
      distortionYScale: new Uniform(0.5),
      colorLiquidTop: new Uniform(colorLiquidTop),
      uDepth
    }
    const defines: any = {}

    const overlayColorUniform = new Uniform(params.overlayColor)
    if (params.overlayColor) {
      uniforms.overlayColor = overlayColorUniform
      defines.USE_OVERLAY_COLOR = true
    }

    const matParams: ShaderMaterialParameters = {
      defines,
      uniforms,
      vertexShader,
      fragmentShader,
      ...matOptions
    }

    if (testOverdraw.value) {
      convertMaterialParamsToOverdrawTest(matParams)
    }

    super(matParams)
    this._mapTextureUniform = mapTexture
    this._overlayColorUniform = overlayColorUniform
    this._colorLiquidTop = colorLiquidTop
    this._colorLiquidTopBase = colorLiquidTopBase
    this._fillPercentage = 0.5
    this._options = options
    this._matOptions = matOptions
    this._uDepth = uDepth
    this._depth = uDepth.value
    this._depthOffset = 0
    UpdateManager.register(this)
  }

  clone(): this {
    return new ManaVialMeshMaterial(this._options, this._matOptions) as this
  }

  get texture() {
    return this._mapTextureUniform.value as Texture
  }

  set texture(val: Texture) {
    this._mapTextureUniform.value = val
  }

  get overlayColor() {
    return this._overlayColorUniform.value
  }

  set overlayColor(val: Color) {
    this._overlayColorUniform.value = val
  }

  update() {
    const phase = standardTimeUniform.value * Math.PI * 2
    const height = 1 - this.fillPercentage
    const heightDelta = Math.cos(phase) * 0.025
    this.uniforms.heightLeft.value = height - heightDelta
    this.uniforms.heightRight.value = height + heightDelta
    this._colorLiquidTop
      .copy(this._colorLiquidTopBase)
      .addScalar(Math.pow(Math.sin(phase * 2 - 1) * 0.5 + 0.5, 2) * 0.05)
    this.uniforms.distortionYScale.value = Math.sin(phase) * 0.2 + 1.1
  }
}
