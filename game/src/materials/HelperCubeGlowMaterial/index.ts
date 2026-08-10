import {
  //AdditiveBlending,
  RawShaderMaterial,
  ShaderMaterialParameters
} from 'three'

import { blendModeParams } from '~/helpers/blendModeHelpers'
import { timeUniformFactory } from '~/timeUniforms'

import fragmentShader from './frag.glsl'
import vertexShader from './vert.glsl'

type HelperCubeGlowMaterialOptions = ShaderMaterialParameters & {}

const __defaultOptions: HelperCubeGlowMaterialOptions = {}

export default class HelperCubeGlowMaterial extends RawShaderMaterial {
  options: HelperCubeGlowMaterialOptions

  constructor(options: Partial<HelperCubeGlowMaterialOptions> = {}) {
    options = { ...__defaultOptions, ...options }

    const uniforms = {
      time: timeUniformFactory.getUniform(0.1)
    }

    super({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      //blending: AdditiveBlending
      ...blendModeParams.screenAlpha
    })

    this.options = options
  }
}
