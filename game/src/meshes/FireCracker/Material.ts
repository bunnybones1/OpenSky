import { Color, IUniform, RawShaderMaterial, Texture, Uniform } from 'three'

import { blendModeParams, SupportedBlendMode } from '~/helpers/blendModeHelpers'
import { UI_DEFAULT_DEPTH } from '~/helpers/I2D'
import { Easing } from '~/systems/animation/Easing'
import { renderMetricsUniforms } from '~/uniforms'

import { IDepthMaterial2D } from '../Mesh2D'
import fragmentShader from './frag.glsl'
import vertexShader from './vert.glsl'

export default class Material
  extends RawShaderMaterial
  implements IDepthMaterial2D
{
  private _opacityUniform: IUniform
  private _progressUniform: IUniform
  private _depth: number
  private _depthOffset: number
  constructor(
    mapTexture: Texture,
    color: Color,
    blendMode: SupportedBlendMode = 'screen'
  ) {
    const opacity = new Uniform(1)
    const progress = new Uniform(0)
    const uDepth = new Uniform(UI_DEFAULT_DEPTH)
    const uniforms: {
      [uniform: string]: IUniform<any>
    } = {
      mapTexture: new Uniform(mapTexture),
      devicePixelRatio: renderMetricsUniforms.finalPointScale,
      opacity,
      progress,
      color: new Uniform(color),
      uDepth
    }
    super({
      vertexShader,
      fragmentShader,
      uniforms,
      ...blendModeParams[blendMode]
    })
    this._opacityUniform = opacity
    this._progressUniform = progress
    this._depth = uDepth.value
    this._depthOffset = 0
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
  get progress() {
    return this._progressUniform.value
  }
  set progress(value: number) {
    this._progressUniform.value = value
    this._opacityUniform.value = Easing.Sinusoidal.Out(1 - value)
  }
}
