import { IUniform, Uniform, Vector2, Vector4 } from 'three'

import { timeUniformFactory } from '~/timeUniforms'
import { aspectRatioUniform } from '~/uniforms'

import RectangleMaterial, {
  RectangleMaterialOptions
} from '../RectangleMaterial'
import fragmentShader from './frag.glsl'
import vertexShader from './vert.glsl'

type HighlightOverlayMaterialOptions = RectangleMaterialOptions & {
  highlight0?: Vector4
  highlight1?: Vector4
}

const __defaultOptions: HighlightOverlayMaterialOptions = {
  highlight0: new Vector4(0.5, 0.5, 0, 1),
  highlight1: new Vector4(0.5, 0.5, 0, 1)
}

type Uniforms = {
  highlight0: IUniform
  highlight1: IUniform
  aspect: IUniform
  time: IUniform
}

export default class HighlightOverlayMaterial extends RectangleMaterial {
  options: HighlightOverlayMaterialOptions
  uniforms: Uniforms
  constructor(options: Partial<HighlightOverlayMaterialOptions> = {}) {
    options = { ...__defaultOptions, ...options }

    const uniforms = {
      highlight0: new Uniform(options.highlight0),
      highlight1: new Uniform(options.highlight1),
      aspect: aspectRatioUniform,
      time: timeUniformFactory.getUniform(0.5)
    }

    const safetyCheck: Uniforms = uniforms
    safetyCheck

    super({
      uniforms,
      vertexShader,
      fragmentShader,
      forceTransparent: true
    })

    this.options = options
  }

  setHighlight0(position: Vector2, radius: number, skew: number) {
    this.uniforms.highlight0.value.set(position.x, position.y, radius, skew)
  }

  setHighlight1(position: Vector2, radius: number, skew: number) {
    this.uniforms.highlight1.value.set(position.x, position.y, radius, skew)
  }

  clearHighlights() {
    this.uniforms.highlight0.value.setZ(0)
    this.uniforms.highlight1.value.setZ(0)
  }
}
