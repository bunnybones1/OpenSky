import { TextureAssetName } from '@opensky/shared/assets'
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

import { AssetsManager } from '~/assets/index'
import { PALETTE_ROW } from '~/constants'
import { UI_DEFAULT_DEPTH } from '~/helpers/I2D'
import { IDepthMaterial2D } from '~/meshes/Mesh2D'
import { testOverdraw } from '~/renderSettings'
import { timeUniformFactory } from '~/timeUniforms'
import { buildParameters } from '~/utils/jsUtils'
import { convertMaterialParamsToOverdrawTest } from '~/utils/materials'

import fragmentShader from './frag.glsl'
import vertexShader from './vert.glsl'

interface Options {
  originalAssetSize?: Vector2
  paletteMap?: TextureAssetName
  paletteMapRowCount?: number
  paletteMapRow?: PALETTE_ROW
  useFancyHighlight?: boolean
  fancyHighlightNoise?: TextureAssetName
  fancyHighlightColor?: Color
  depth?: number
  alphaTextureAsset?: TextureAssetName
  useFragmentTextureSampler?: boolean
}

const __defaultMatOptions: Partial<MaterialParameters> = {
  side: FrontSide,
  transparent: true,
  depthWrite: false,
  depthTest: true
}

const __defaultOptions: Partial<Options> = {
  originalAssetSize: new Vector2(36, 36),
  paletteMap: 'uiPalette',
  paletteMapRow: PALETTE_ROW.PURPLE,
  paletteMapRowCount: 64,
  fancyHighlightNoise: 'fireEffectSourceMap',
  fancyHighlightColor: new Color(0.9, 0.6, 0.1),
  depth: UI_DEFAULT_DEPTH,
  useFragmentTextureSampler: false
}

export default class PaletteMappedVertexColorMeshMaterial
  extends RawShaderMaterial
  implements IDepthMaterial2D
{
  private _options: Options
  private _matOptions: MaterialParameters
  private _paletteVOffsetUniform: Uniform
  private _fancyColorUniform: Uniform | undefined
  private _params: Partial<Options>
  private _depth: number
  private _depthOffset: number
  private _useRotationMatrix: boolean
  private _rotationMatrixUniform: Uniform
  private _rotationMatrix: Vector2
  get useRotationMatrix(): boolean {
    return this._useRotationMatrix
  }
  set useRotationMatrix(value: boolean) {
    if (this._useRotationMatrix === value) {
      return
    }
    this._useRotationMatrix = value
    if (value) {
      if (!this._rotationMatrixUniform) {
        this._rotationMatrix = new Vector2()
        this._rotationMatrixUniform = new Uniform(this._rotationMatrix)
      }
      this.uniforms.uRotationMatrix = this._rotationMatrixUniform
    } else {
      delete this.uniforms.uRotationMatrix
    }
    this.defines.USE_ROTATION_MATRIX = value
    this.needsUpdate = true
  }
  get useFragmentTextureSampler(): boolean {
    return !!this._params.useFragmentTextureSampler
  }
  set useFragmentTextureSampler(value: boolean) {
    if (this._params.useFragmentTextureSampler === value) {
      return
    }
    this._params.useFragmentTextureSampler = value

    this.defines.USE_FRAGMENT_TEXTURE_SAMPLER = value
    this.needsUpdate = true
  }
  private _angle: number
  get angle(): number {
    return this._angle
  }
  set angle(value: number) {
    if (value === this._angle) {
      return
    }
    this.useRotationMatrix = value !== 0
    this._rotationMatrix.set(Math.cos(value), Math.sin(value))
    this._angle = value
  }

  constructor(
    private _assetsManager: AssetsManager,
    options: Options = {},
    matOptions: MaterialParameters = {}
  ) {
    const params = buildParameters(__defaultOptions, options)
    const matParams = buildParameters(__defaultMatOptions, matOptions)
    const paletteVOffsetUniform = new Uniform(
      (params.paletteMapRow! + 0.5) / params.paletteMapRowCount!
    )
    const uDepth = new Uniform(options.depth ?? UI_DEFAULT_DEPTH)
    const uniforms: {
      [uniform: string]: IUniform<any>
    } = {
      uOriginalAssetSize: new Uniform(
        new Vector2(params.originalAssetSize!.x, -params.originalAssetSize!.y)
      ),
      uPaletteMap: _assetsManager.getLazyTextureAssetUniform(
        params.paletteMap!
      ),
      uPaletteVOffset: paletteVOffsetUniform,
      uDepth
    }

    const defines: Partial<{
      FANCY_HIGHLIGHT: boolean
      USE_ALPHA_TEXTURE: boolean
      USE_FRAGMENT_TEXTURE_SAMPLER: boolean
    }> = {}

    const uFancyColor = new Uniform(params.fancyHighlightColor)
    if (params.useFancyHighlight) {
      defines.FANCY_HIGHLIGHT = true
      uniforms.uTime = timeUniformFactory.getUniform(0.05)
      uniforms.uFancyMap = _assetsManager.getLazyTextureAssetUniform(
        params.fancyHighlightNoise!
      )
      uniforms.uFancyColor = uFancyColor
    }

    if (params.alphaTextureAsset) {
      uniforms.uAlphaTexture =
        _assetsManager.getLazyTextureAssetUniform('optionsBg')
      defines.USE_ALPHA_TEXTURE = true
    }

    if (params.useFragmentTextureSampler) {
      defines.USE_FRAGMENT_TEXTURE_SAMPLER = true
    }

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

    this._useRotationMatrix = false
    this._angle = 0

    this._depth = uDepth.value
    this._depthOffset = 0
    this._paletteVOffsetUniform = paletteVOffsetUniform
    this._fancyColorUniform = uFancyColor
    this._options = options
    this._params = params
    this._matOptions = matOptions
  }

  get paletteRow() {
    return (
      this._params.paletteMapRowCount! * this._paletteVOffsetUniform.value - 0.5
    )
  }

  set paletteRow(val: PALETTE_ROW) {
    this._paletteVOffsetUniform.value =
      (val + 0.5) / this._params.paletteMapRowCount!
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

  setFancyHighlightColor(color: Color) {
    if (this._fancyColorUniform) {
      this._fancyColorUniform.value = color
    }
  }

  clone(): this {
    return this.variant()
  }
  variant(
    options?: Partial<Options>,
    matOptions?: Partial<MaterialParameters>
  ): this {
    return new PaletteMappedVertexColorMeshMaterial(
      this._assetsManager,
      { ...this._options, ...options },
      { ...this._matOptions, ...matOptions }
    ) as this
  }
}
