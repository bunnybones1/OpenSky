import {
  AdditiveBlending,
  Color,
  FrontSide,
  RawShaderMaterial,
  Uniform
} from 'three'

import fragmentShader from './frag.glsl'
import vertexShader from './vert.glsl'

export default class OverdrawOpaqueMeshMaterial extends RawShaderMaterial {
  constructor(color: string | number | Color) {
    if (!(color instanceof Color)) {
      color = new Color(color)
    }
    super({
      uniforms: {
        color: new Uniform(color)
      },
      vertexShader,
      fragmentShader,
      side: FrontSide,
      transparent: false,
      depthWrite: true,
      depthTest: true,
      blending: AdditiveBlending
    })
  }
}
