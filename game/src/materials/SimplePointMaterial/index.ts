import {
  IUniform,
  RawShaderMaterial,
  ShaderMaterialParameters,
  Uniform
} from 'three'

import { renderMetricsUniforms } from '~/uniforms'

import fragmentShader from './frag.glsl'
import vertexShader from './vert.glsl'

export default class SimplePointMaterial extends RawShaderMaterial {
  private _pointSizeUniform: IUniform
  get pointSizeUniform() {
    return this._pointSizeUniform
  }
  constructor(pointSize = 4) {
    const pointSizeUniform = new Uniform(pointSize)
    const uniforms: {
      [uniform: string]: IUniform<any>
    } = {
      size: pointSizeUniform,
      devicePixelRatio: renderMetricsUniforms.finalPointScale
    }

    const defines: any = {
      USE_2D_MODE: true
    }

    const params: ShaderMaterialParameters = {
      defines,
      vertexShader,
      fragmentShader,
      uniforms,
      transparent: true
    }

    super(params)
    this._pointSizeUniform = pointSizeUniform
  }
}
