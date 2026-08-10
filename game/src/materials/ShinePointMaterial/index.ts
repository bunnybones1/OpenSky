import {
  Color,
  IUniform,
  RawShaderMaterial,
  ShaderMaterialParameters,
  Uniform,
  Vector3
} from 'three'

import { blendModeParams } from '~/helpers/blendModeHelpers'
import { timeUniformFactory } from '~/timeUniforms'
import { renderMetricsUniforms } from '~/uniforms'

import fragmentShader from './frag.glsl'
import vertexShader from './vert.glsl'

const __pointSizeUniform = new Uniform(1)

const __tempSunPos = new Vector3(5, 0, 0)

export default class ShinePointMaterial extends RawShaderMaterial {
  constructor() {
    const lightPosition = new Uniform(__tempSunPos)
    const uniforms: {
      [uniform: string]: IUniform<any>
    } = {
      lightBrightness: new Uniform(0),
      finalPointScale: renderMetricsUniforms.finalPointScale,
      lightColor: new Uniform(new Color(1, 1, 1)),
      materialColor: new Uniform(new Color(1, 1, 1)),
      lightPosition,
      size: __pointSizeUniform,
      uTime: timeUniformFactory.getUniform(0.01),
      uTimeOffset: new Uniform(Math.random() * -1.0)
    }

    const defines: any = {
      USE_METAL_SHINE: true
    }

    const params: ShaderMaterialParameters = {
      defines,
      vertexShader,
      fragmentShader,
      uniforms,
      ...blendModeParams.screen,
      needsModelNormalMatrix: true
    }

    super(params)
  }

  clone(): this {
    return new ShinePointMaterial() as this
  }

  set lightPosition(value: Uniform) {
    this.uniforms.lightPosition = value
  }

  set lightColor(value: Uniform) {
    this.uniforms.lightColor = value
  }

  set lightBrightness(value: Uniform) {
    this.uniforms.lightBrightness = value
  }

  set materialColor(value: Color) {
    this.uniforms.materialColor.value = value
  }
}
