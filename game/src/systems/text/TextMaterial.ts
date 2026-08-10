import { Color, IUniform, ShaderMaterial, Uniform, Vector4 } from 'three'

import Gradient from '~/colors/Gradient'
import { UI_DEFAULT_DEPTH } from '~/helpers/I2D'
import { IDepthMaterial2D } from '~/meshes/Mesh2D'
import { renderMetricsUniforms } from '~/uniforms'

import fragmentShader from './frag.glsl'
import * as textOptions from './TextOptions'
import vertexShader from './vert.glsl'

type GLPropType = 'attribute' | 'uniform'

export default class TextMaterial
  extends ShaderMaterial
  implements IDepthMaterial2D
{
  private _colorMode: GLPropType
  private _weightMode: GLPropType
  private _depth: number
  private _depthOffset: number
  get depth(): number {
    return this._depth
  }
  set depth(value: number) {
    this._depth = value
    this.uniforms.uDepth.value = this._depth + this._depthOffset
  }
  get depthOffset(): number {
    return this._depthOffset
  }
  set depthOffset(value: number) {
    this._depthOffset = value
    this.uniforms.uDepth.value = this._depth + this._depthOffset
  }
  getFinalDepth() {
    return this.uniforms.uDepth.value
  }

  get colorMode() {
    return this._colorMode
  }

  get weightMode() {
    return this._weightMode
  }

  constructor(
    options: textOptions.TextOptions,
    colorMode: GLPropType,
    weightMode: GLPropType,
    overrideColor?: Color
  ) {
    const uniforms: { [uniform: string]: IUniform<any> } = {
      msdf: new Uniform(options.fontFace.msdfTexture),
      alphaTest: new Uniform(options.alphaTest),
      opacity: new Uniform(1.0),
      contrastMultiplier: new Uniform(options.contrastMultiplier)
    }

    if (options.screenSpace) {
      uniforms.offset = new Uniform(options.offset)
      uniforms.clipSpacePosition = new Uniform(new Vector4())
      uniforms.pixelSizeInClipSpace = renderMetricsUniforms.metreSizeInClipSpace
      uniforms.prescale = new Uniform(options.prescale)
    }

    const hardText =
      options.alphaTest > 0 && options.alphaTest < 1 && !options.shadow

    const defines: any = {}
    if (options.strokeWidth > 0) {
      defines.USE_STROKE = true
      uniforms.strokeWidth = new Uniform(options.strokeWidth)
      uniforms.strokeBias = new Uniform(options.strokeBias)
      uniforms.strokeColor = new Uniform(new Color(options.strokeColor))
    }
    if (hardText) {
      defines.USE_ALPHATEST = true
    }
    if (options.shadow) {
      defines.USE_SHADOW = true
    }
    if (options.screenSpace) {
      defines.USE_SCREENSPACE = true
    }
    if (options.constantSizeOnScreen) {
      defines.CONSTANT_SIZE_ON_SCREEN = true
    }
    if (options.useDerivative) {
      defines.USE_DERIVATIVE = true
    }

    if (colorMode === 'uniform') {
      if (options.color instanceof Gradient) {
        throw new Error(
          'Please provide color string or number for color uniform'
        )
      }
      uniforms.color = new Uniform(new Color(overrideColor || options.color))
      defines.USE_COLOR_UNIFORM = true
    }

    if (weightMode === 'uniform') {
      uniforms.weight = new Uniform(options.weight + 1.0)
      defines.USE_WEIGHT_UNIFORM = true
    }

    if (options.use2dMode) {
      defines.USE_2D_MODE = true
      uniforms.uDepth = new Uniform(UI_DEFAULT_DEPTH)
    }

    super({
      defines,
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: hardText
    })

    this._colorMode = colorMode
    this._weightMode = weightMode
    if (options.use2dMode) {
      this._depth = uniforms.uDepth.value
      this._depthOffset = 0
    }
  }

  // @ts-ignore ts(2611)
  get opacity() {
    return this.uniforms ? this.uniforms.opacity.value : 1
  }
  set opacity(value: number) {
    if (this.uniforms) {
      this.uniforms.opacity.value = value
    }
  }
  get color() {
    return this.uniforms.color.value
  }
  set color(value: Color) {
    this.uniforms.color.value.set(value)
  }
  get weight() {
    return this.uniforms.weight.value
  }
  set weight(value: number) {
    this.uniforms.weight.value = value
  }
}
