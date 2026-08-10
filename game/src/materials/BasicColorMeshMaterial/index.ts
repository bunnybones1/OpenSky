import {
  Color,
  FrontSide,
  IUniform,
  MaterialParameters,
  RawShaderMaterial,
  ShaderMaterialParameters,
  Uniform
} from 'three'

import { testOverdraw } from '~/renderSettings'
import { copyDefaults } from '~/utils/jsUtils'
import { convertMaterialParamsToOverdrawTest } from '~/utils/materials'

import fragmentShader from './frag.glsl'
import vertexShader from './vert.glsl'

type BasicColorMeshMaterialParameters = MaterialParameters & {
  color?: Color | string | number
  opacity?: number
}

const __defaults = {
  side: FrontSide,
  transparent: false
}

export default class BasicColorMeshMaterial extends RawShaderMaterial {
  constructor(matOptions: BasicColorMeshMaterialParameters = {}) {
    copyDefaults(matOptions, __defaults)

    const uniforms: { [uniform: string]: IUniform<any> } = {
      color: new Uniform(new Color(matOptions.color)),
      opacity: new Uniform(
        typeof matOptions.opacity === 'number' ? matOptions.opacity : 1
      )
    }

    const defines: any = {}

    const params: ShaderMaterialParameters = {
      defines,
      uniforms,
      vertexShader,
      fragmentShader,
      ...matOptions
    }

    if (testOverdraw.value) {
      convertMaterialParamsToOverdrawTest(params)
    }

    super(params)
  }

  get color() {
    return this.uniforms.color.value
  }

  set color(value: Color | string | number) {
    this.uniforms.color.value = new Color(value)
  }

  hardWireColor(value: Color) {
    this.uniforms.color.value = value
  }

  // @ts-ignore ts(2611)
  get opacity() {
    return this.uniforms.opacity && this.uniforms.opacity.value
  }

  set opacity(value: number) {
    if (this.uniforms && this.uniforms.opacity) {
      this.uniforms.opacity.value = value
    }
  }
}
