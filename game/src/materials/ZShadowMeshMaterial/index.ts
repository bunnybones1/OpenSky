import {
  FrontSide,
  IUniform,
  MaterialParameters,
  RawShaderMaterial,
  ShaderMaterialParameters,
  Uniform
} from 'three'

import { copyDefaults } from '~/utils/jsUtils'

import fragmentShader from './frag.glsl'
import vertexShader from './vert.glsl'

type ZShadowMeshMaterialParameters = MaterialParameters & {
  zScale?: number
  opacity?: number
}

const __defaults = {
  side: FrontSide,
  transparent: true,
  depthWrite: false,
  opacity: 1,
  zScale: 38
}

export default class ZShadowMeshMaterial extends RawShaderMaterial {
  private _uOpacity: Uniform
  constructor(matOptions: ZShadowMeshMaterialParameters = {}) {
    copyDefaults(matOptions, __defaults)
    const uOpacity = new Uniform(matOptions.opacity)
    const uniforms: {
      [uniform: string]: IUniform<any>
    } = {
      uZScale: new Uniform(matOptions.zScale),
      uOpacity
    }

    const defines: any = {}

    // XXX This prevents warnings of: THREE.ShaderMaterial: 'zScale' is not a property of this material.
    delete matOptions.zScale

    const params: ShaderMaterialParameters = {
      defines,
      uniforms,
      vertexShader,
      fragmentShader,
      ...matOptions
    }

    super(params)
    this._uOpacity = uOpacity
  }

  // @ts-ignore ts(2611)
  set opacity(val: number) {
    if (this._uOpacity && this.uniforms?.opacity === this._uOpacity) {
      this._uOpacity.value = val
    }
  }
  get opacity() {
    return this.uniforms.uOpacity.value
  }
}
