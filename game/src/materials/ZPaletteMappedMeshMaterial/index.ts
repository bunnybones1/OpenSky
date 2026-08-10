import { TextureAssetName } from '@opensky/shared/assets'
import {
  Color,
  FrontSide,
  IUniform,
  MaterialParameters,
  RawShaderMaterial,
  ShaderMaterialParameters,
  Uniform,
  Vector2,
  Vector3,
  Vector4
} from 'three'

import { getAssetsManager } from '~/assets/index'
import { aspectRatioUniform, renderMetricsUniforms } from '~/uniforms'
import { buildParameters } from '~/utils/jsUtils'

import fragmentShader from './frag.glsl'
import vertexShader from './vert.glsl'

export interface ZPaletteShaderOptions {
  paletteMap?: TextureAssetName
  paletteMapRowCount?: number
  paletteMapRow?: number
  paletteRangeMapper?: Vector3 // x, y, z ==> offset, scale, curve
  screenSpace?: boolean
  prescale?: number | Vector2
  paletteMapRowAnimLength?: number
  paletteMapRowAnimDuration?: number
  overlayColor?: Color
  supportsOpacity?: boolean
}

const __matDefaults: MaterialParameters = {
  side: FrontSide,
  transparent: true,
  depthWrite: false
}

const __shaderDefaults: ZPaletteShaderOptions = {
  paletteMapRow: 0,
  paletteMapRowCount: 16,
  paletteRangeMapper: new Vector3(0, 1, 0),
  screenSpace: false,
  prescale: new Vector2(1, 1),
  paletteMapRowAnimLength: 0,
  paletteMapRowAnimDuration: 1,
  supportsOpacity: false
}

export default class ZPaletteMappedMeshMaterial extends RawShaderMaterial {
  private _prescale: Vector2
  private _viewScale: number
  private _options: ZPaletteShaderOptions
  private _matOptions: MaterialParameters
  private _paletteVOffsetUniform: Uniform
  private _paletteMapRow: number
  private _paletteMapRowCount: number
  private _paletteMapRowAnimLength: number
  private _paletteMapRowAnimDuration: number
  paletteRangeMapper: Vector3
  private _finalScale: Vector2
  private _opacityUniform: Uniform

  private _supportsOpacity: boolean
  get supportsOpacity(): boolean {
    return this._supportsOpacity
  }
  set supportsOpacity(value: boolean) {
    if (value === this._supportsOpacity) {
      return
    }
    if (value) {
      this.uniforms.uOpacity = this._opacityUniform
      this.defines.USE_OPACITY = true
    }

    this._supportsOpacity = value
  }

  update(time: number) {
    this._paletteVOffsetUniform.value =
      (this._paletteMapRow +
        0.5 +
        ((time / this._paletteMapRowAnimDuration) % 1) *
          this._paletteMapRowAnimLength) /
      this._paletteMapRowCount
  }

  private _updateScale() {
    this._finalScale.copy(this._prescale).multiplyScalar(this._viewScale)
  }

  get viewScale(): number {
    return this._viewScale
  }
  set viewScale(value: number) {
    if (value === this._viewScale) {
      return
    }
    this._viewScale = value

    this._updateScale()
  }

  constructor(
    options: ZPaletteShaderOptions = {},
    matOptions: MaterialParameters = {}
  ) {
    const matParams = buildParameters(__matDefaults, matOptions)
    const shaderParams = buildParameters(__shaderDefaults, options)

    const paletteRangeMapper = shaderParams.paletteRangeMapper!.clone()
    const uPaletteRangeMapper = new Uniform(paletteRangeMapper)

    const uAspect = aspectRatioUniform

    const paletteVOffsetUniform = new Uniform(
      (shaderParams.paletteMapRow! + 0.5) / shaderParams.paletteMapRowCount!
    )
    const uniforms: {
      [uniform: string]: IUniform<any>
    } = {
      uPaletteMap: getAssetsManager().getLazyTextureAssetUniform(
        shaderParams.paletteMap!
      ),
      uPaletteVOffset: paletteVOffsetUniform,
      uPaletteRangeMapper,
      uAspect
    }

    const defines: any = {}
    const prescale =
      shaderParams.prescale instanceof Vector2
        ? shaderParams.prescale
        : new Vector2(shaderParams.prescale, shaderParams.prescale)
    const finalScale = new Vector2(1, 1)
    const scaleUniform = new Uniform(finalScale)

    if (shaderParams.screenSpace) {
      uniforms.clipSpacePosition = new Uniform(new Vector4())
      uniforms.pixelSizeInClipSpace = renderMetricsUniforms.metreSizeInClipSpace
      uniforms.scale = scaleUniform
      defines.USE_SCREENSPACE = true
    }

    const overlayColorUniform = new Uniform(shaderParams.overlayColor)
    if (shaderParams.overlayColor) {
      uniforms.uOverlayColor = overlayColorUniform
      defines.USE_OVERLAY_COLOR = true
    }

    const opacityUniform = new Uniform(1)
    if (shaderParams.supportsOpacity) {
      uniforms.uOpacity = opacityUniform
      defines.USE_OPACITY = true
    }

    const params: ShaderMaterialParameters = {
      defines,
      uniforms,
      vertexShader,
      fragmentShader,
      ...matParams
    }

    super(params)
    this._options = options
    this._matOptions = matOptions
    this._prescale = prescale
    this._viewScale = 1
    this._paletteVOffsetUniform = paletteVOffsetUniform
    this._opacityUniform = opacityUniform
    this._paletteMapRow = shaderParams.paletteMapRow!
    this._paletteMapRowCount = shaderParams.paletteMapRowCount!
    this._paletteMapRowAnimLength = shaderParams.paletteMapRowAnimLength!
    this._paletteMapRowAnimDuration = shaderParams.paletteMapRowAnimDuration!
    this._finalScale = finalScale
    this.paletteRangeMapper = paletteRangeMapper!
  }

  // @ts-ignore ts(2611)
  set opacity(value: number) {
    if (this._opacityUniform) {
      this.supportsOpacity = value !== 1
      this._opacityUniform.value = value
    }
  }

  get opacity() {
    if (this._opacityUniform) {
      return this._opacityUniform.value
    } else {
      return 1
    }
  }

  clone(): this {
    return new ZPaletteMappedMeshMaterial(
      this._options,
      this._matOptions
    ) as this
  }
  variant(
    options?: Partial<ZPaletteShaderOptions>,
    matParams?: Partial<MaterialParameters>
  ): this {
    return new ZPaletteMappedMeshMaterial(
      { ...this._options, ...options },
      { ...this._matOptions, ...matParams }
    ) as this
  }
}
