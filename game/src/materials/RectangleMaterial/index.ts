import {
  Color,
  IUniform,
  RawShaderMaterial,
  Texture,
  Uniform,
  Vector3
} from 'three'

import { blendModeParams } from '~/helpers/blendModeHelpers'
import { UI_DEFAULT_DEPTH } from '~/helpers/I2D'
import { IDepthMaterial2D } from '~/meshes/Mesh2D'
import { timeUniformFactory } from '~/timeUniforms'

import fragmentShader from './frag.glsl'
import vertexShader from './vert.glsl'

export interface RectangleMaterialOptions {
  map?: Texture
  vertexShader?: string
  fragmentShader?: string
  uniforms?: { [key: string]: Uniform }
  forceTransparent?: boolean
  blendMode?: 'normal' | 'screen' | 'screenAlpha'
  progressFill?: { colorLeft: Color; colorRight: Color; initValue: number }
  wireframe?: true
  dashParameters?: { count: number; ratio: number; padding: number }
  depth?: number
  colorMode?: 'MULTIPLY' | 'SCREEN'
  glitchy?: boolean
}

export default class RectangleMaterial
  extends RawShaderMaterial
  implements IDepthMaterial2D
{
  /**
   * @deprecated Use Mesh2D's matrix.opacity instead.
   */
  opacity: number

  private _progressFillUniform: Uniform
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

  get progressFill(): number {
    return this._progressFillUniform.value
  }
  set progressFill(value: number) {
    this._progressFillUniform.value = value
  }

  constructor(options: RectangleMaterialOptions) {
    const uDepth = new Uniform(options.depth ?? UI_DEFAULT_DEPTH)
    const uniforms: {
      [uniform: string]: IUniform<any>
    } = {
      ...options.uniforms,
      uDepth
    }
    const defines: { [K: string]: boolean } = {}
    if (options.map) {
      uniforms.mapTexture = new Uniform(options.map)
      defines.USE_MAP = true
    }
    const progressFillUniform = new Uniform(0.5)
    if (options.progressFill) {
      uniforms.progressColorLeft = new Uniform(options.progressFill.colorLeft)
      uniforms.progressColorRight = new Uniform(options.progressFill.colorRight)
      progressFillUniform.value = options.progressFill.initValue
      uniforms.progressFill = progressFillUniform
      defines.USE_PROGRESS_FILL = true
    }
    if (options.dashParameters) {
      const dashesCountRatioPadding = new Uniform(
        new Vector3(
          options.dashParameters.count - 1,
          options.dashParameters.ratio,
          Math.max(options.dashParameters.padding, 0.0001)
        )
      )
      uniforms.dashesCountRatioPadding = dashesCountRatioPadding
      defines.USE_DASHES = true
    }
    if (options.colorMode === 'SCREEN') {
      defines.USE_COLOR_MODE_SCREEN = true
    }
    if (options.glitchy) {
      defines.USE_GLITCH = true
      uniforms.uTime = timeUniformFactory.getUniform(2)
    }
    const transparent = true
    super({
      vertexShader: options.vertexShader || vertexShader,
      fragmentShader: options.fragmentShader || fragmentShader,
      transparent,
      depthWrite: !transparent,
      depthTest: true,
      uniforms,
      defines,
      wireframe: !!options.wireframe,
      ...blendModeParams[options.blendMode || 'normal']
    })
    this._progressFillUniform = progressFillUniform
    this._depth = uDepth.value
    this._depthOffset = 0
    this._uDepth = uDepth
  }
}
