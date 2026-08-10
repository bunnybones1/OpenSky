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

type ContactShadowMeshMaterialParameters = MaterialParameters & {
  opacity?: number
  strength?: number
}

const __defaults = {
  side: FrontSide,
  transparent: true,
  depthWrite: false,
  opacity: 1,
  strength: 0.5
}

export default class ContactShadowMeshMaterial extends RawShaderMaterial {
  private _uOpacity: Uniform
  constructor(matOptions: ContactShadowMeshMaterialParameters = {}) {
    copyDefaults(matOptions, __defaults)
    const uOpacity = new Uniform(matOptions.opacity)
    const uStrength = new Uniform(matOptions.strength)
    const uniforms: {
      [uniform: string]: IUniform<any>
    } = {
      uOpacity,
      uStrength
    }

    const defines: any = {}

    // XXX This prevents warnings of: THREE.ShaderMaterial: 'strength' is not a property of this material.
    delete matOptions.strength

    const params: ShaderMaterialParameters = {
      defines,
      uniforms,
      vertexShader,
      fragmentShader,
      ...matOptions
    }

    super(params)
    this._uOpacity = uOpacity

    this.uniforms.uStrength = uStrength
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

  set strength(val: number) {
    this.uniforms.uStrength.value = val
  }
  get strength() {
    return this.uniforms.uStrength.value
  }
}
