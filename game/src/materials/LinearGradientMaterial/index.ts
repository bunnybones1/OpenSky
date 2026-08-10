import {
  Color,
  DoubleSide,
  IUniform,
  RawShaderMaterial,
  ShaderMaterialParameters,
  Uniform
} from 'three'

import fragmentShader from './frag.glsl'
import vertexShader from './vert.glsl'

type LinearGradientMaterialOptions = ShaderMaterialParameters & {
  startColor?: Color | number | string
  endColor?: Color | number | string
  startOpacity?: number
  endOpacity?: number
}

const __defaultOptions: LinearGradientMaterialOptions = {
  startColor: new Color(0xffffff),
  endColor: new Color(0xffffff),
  startOpacity: 1,
  endOpacity: 1
}

export default class LinearGradientMaterial extends RawShaderMaterial {
  options: LinearGradientMaterialOptions

  constructor(options: Partial<LinearGradientMaterialOptions> = {}) {
    options = { ...__defaultOptions, ...options }

    const uniforms: {
      [uniform: string]: IUniform<any>
    } = {
      startColor: new Uniform(new Color(options.startColor)),
      endColor: new Uniform(new Color(options.endColor)),
      startOpacity: new Uniform(options.startOpacity),
      endOpacity: new Uniform(options.endOpacity),
      opacity: new Uniform(1)
    }

    super({
      uniforms,
      vertexShader,
      fragmentShader,
      side: DoubleSide,
      transparent: true,
      depthWrite: false
    })

    this.options = options
  }

  // @ts-ignore ts(2611)
  get opacity() {
    return this.uniforms && this.uniforms.opacity && this.uniforms.opacity.value
  }

  set opacity(value: number) {
    if (this.uniforms && this.uniforms.opacity) {
      this.uniforms.opacity.value = value
    }
  }
}
