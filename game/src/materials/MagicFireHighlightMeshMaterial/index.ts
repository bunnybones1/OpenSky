import { TextureAssetName } from '@opensky/shared/assets'
import {
  AddEquation,
  Color,
  CustomBlending,
  FrontSide,
  IUniform,
  OneFactor,
  OneMinusSrcAlphaFactor,
  RawShaderMaterial,
  Side,
  Uniform,
  Vector2,
  Vector4
} from 'three'

import { AssetsManager } from '~/assets/index'
import { UI_DEFAULT_DEPTH } from '~/helpers/I2D'
import { IDepthMaterial2D } from '~/meshes/Mesh2D'
import { timeUniformFactory } from '~/timeUniforms'
import { buildParameters } from '~/utils/jsUtils'

import fragmentShader from './frag.glsl'
import vertexShader from './vert.glsl'

let _fragmentShader = fragmentShader
let _vertexShader = vertexShader

const __instances: MagicFireHighlightMeshMaterial[] = []

if (import.meta.hot) {
  function handleHMR() {
    for (const i of __instances) {
      i.fragmentShader = _fragmentShader
      i.vertexShader = _vertexShader
      i.needsUpdate = true
    }
  }
  import.meta.hot.accept('./frag.glsl', mod => {
    _fragmentShader = mod!.default
    handleHMR()
  })
  import.meta.hot.accept('./vert.glsl', mod => {
    _vertexShader = mod!.default
    handleHMR()
  })
}

export interface MagicFireHighlightMeshMaterialOptions {
  map?: TextureAssetName
  color?: Color
  color2?: Color
  opacity?: number
  scrollTiling?: Vector2
  useLengthRatio?: boolean
  speed?: number
  rectSize?: Vector2
  use2dMode?: boolean
  side?: Side
  alphaThresholdScale?: number
  alphaThresholdOffset?: number
  useProgress?: boolean
  depth?: number
  thicknessBase?: number
  thicknessRatio?: number
  perpectiveCompensation?: number
  opacityRamp?: Vector2
  uvScaleV?: number
  colorStrength?: Vector4
  coreHotness?: number
}

const __defaultOptions: Partial<MagicFireHighlightMeshMaterialOptions> = {
  map: 'fireEffectSourceMap',
  color: new Color(0xffffff),
  opacity: 1,
  scrollTiling: new Vector2(-7, 22),
  useLengthRatio: false,
  speed: 0.006125,
  side: FrontSide,
  alphaThresholdScale: 3,
  alphaThresholdOffset: -0.8,
  useProgress: false,
  thicknessBase: 0.22,
  thicknessRatio: 1,
  opacityRamp: new Vector2(3, -1),
  perpectiveCompensation: 1,
  uvScaleV: 1,
  colorStrength: new Vector4(1, 1, 1, 1),
  coreHotness: 0,
  depth: UI_DEFAULT_DEPTH
}

function __uniqueVec2() {
  return new Vector2(Math.random() * 10, Math.random() * 10)
}

export default class MagicFireHighlightMeshMaterial
  extends RawShaderMaterial
  implements IDepthMaterial2D
{
  options: MagicFireHighlightMeshMaterialOptions
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
  private _progressUniform: Uniform
  get progress(): number {
    return this._progressUniform.value
  }
  set progress(value: number) {
    this._progressUniform.value = value
  }
  private _uThicknessBase: Uniform
  get thicknessBase(): number {
    return this._uThicknessBase.value
  }
  set thicknessBase(value: number) {
    this._uThicknessBase.value = value
  }
  private _uThicknessRatio: Uniform
  get thicknessRatio(): number {
    return this._uThicknessRatio.value
  }
  set thicknessRatio(value: number) {
    this._uThicknessRatio.value = value
  }
  private _uPerspectiveCompensation: Uniform
  get perspectiveCompensation(): number {
    return this._uPerspectiveCompensation.value
  }
  set perspectiveCompensation(value: number) {
    this._uPerspectiveCompensation.value = value
  }
  private _uUvScaleV: Uniform
  get uvScaleV(): number {
    return this._uUvScaleV.value
  }
  set uvScaleV(value: number) {
    this._uUvScaleV.value = value
  }
  constructor(
    private _assetsManager: AssetsManager,
    options: MagicFireHighlightMeshMaterialOptions
  ) {
    const params = buildParameters(__defaultOptions, options)
    const uDepth = new Uniform(params.depth)
    const uOpacityRamp = new Uniform(params.opacityRamp!)
    const uThicknessBase = new Uniform(params.thicknessBase!)
    const uThicknessRatio = new Uniform(params.thicknessRatio!)
    const uPerpectiveCompensation = new Uniform(params.perpectiveCompensation!)
    const uUvScaleV = new Uniform(params.uvScaleV!)
    const uColorStrength = new Uniform(params.colorStrength!)
    const uCoreHotness = new Uniform(params.coreHotness!)
    const uMap = _assetsManager.getLazyTextureAssetUniform(params.map!)
    const uniforms: {
      [uniform: string]: IUniform<any>
    } = {
      uMap,
      color1: new Uniform(new Color(params.color)),
      opacity: new Uniform(params.opacity),
      time: timeUniformFactory.getUniform(params.speed!),
      uniqueness: new Uniform(__uniqueVec2()),
      scrollTiling: new Uniform(params.scrollTiling),
      alphaThreshold: new Uniform(
        new Vector2(params.alphaThresholdScale, params.alphaThresholdOffset)
      ),
      uThicknessBase,
      uThicknessRatio,
      uPerpectiveCompensation,
      uOpacityRamp,
      uDepth,
      uUvScaleV,
      uColorStrength,
      uCoreHotness
    }
    const defines: any = {}
    const progressUniform = new Uniform(0.3)

    if (params.useLengthRatio) {
      uniforms.lengthRatio = new Uniform(4)
      defines.USE_LENGTH_RATIO = true
    }
    if (params.color2) {
      uniforms.color2 = new Uniform(new Color(params.color2))
      defines.USE_LENGTH_RATIO = true
      defines.USE_TWO_COLORS = true
    }

    if (params.use2dMode) {
      defines.USE_2D_MODE = true
    }

    if (params.useProgress) {
      uniforms.progress = progressUniform
      defines.USE_PROGRESS = true
    }

    super({
      defines,
      uniforms,
      vertexShader: _vertexShader,
      fragmentShader: _fragmentShader,
      side: params.side,
      transparent: true,
      depthWrite: false,
      blending: CustomBlending,
      blendSrc: OneFactor,
      blendDst: OneMinusSrcAlphaFactor,
      blendSrcAlpha: OneFactor,
      blendDstAlpha: OneMinusSrcAlphaFactor,
      blendEquation: AddEquation
    })
    this._uThicknessBase = uThicknessBase
    this._uThicknessRatio = uThicknessRatio

    this._progressUniform = progressUniform
    this._uDepth = uDepth
    this._depth = uDepth.value
    this._depthOffset = 0
    this.options = options
    if (import.meta.hot) {
      __instances.push(this)
    }
  }

  setUvST(value: Vector4) {
    this.uniforms.uUvST = new Uniform(value)
    this.defines.USE_UV_ST = true
    this.needsUpdate = true
  }

  clone(): this {
    return this.variant()
  }
  variant(options?: Partial<MagicFireHighlightMeshMaterialOptions>) {
    return new MagicFireHighlightMeshMaterial(this._assetsManager, {
      ...this.options,
      ...options
    }) as this
  }

  // @ts-ignore ts(2611)
  set opacity(value: number) {
    if (this.uniforms) {
      this.uniforms.opacity.value = value
    }
  }
  get opacity() {
    return this.uniforms.opacity.value
  }
  set color(value: Color) {
    this.uniforms.color1.value = value
  }
  get color() {
    return this.uniforms.color1.value as Color
  }
  set color2(value: Color) {
    this.uniforms.color2.value = value
  }
  get color2() {
    return this.uniforms.color2.value as Color
  }
  set lengthRatio(value: number) {
    this.uniforms.lengthRatio.value = value
  }
}
