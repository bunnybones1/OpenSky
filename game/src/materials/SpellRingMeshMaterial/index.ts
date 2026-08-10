import {
  AddEquation,
  Color,
  CustomBlending,
  FrontSide,
  IUniform,
  OneFactor,
  OneMinusSrcAlphaFactor,
  RawShaderMaterial,
  Uniform
} from 'three'

import { simpleTweener } from '~/systems/animation/tweeners'
import { timeUniformFactory } from '~/timeUniforms'

import fragmentShader from './frag.glsl'
import vertexShader from './vert.glsl'

interface SpellRingMeshMaterialOptions {
  color?: Color
  speed?: number
  opacity?: number
}

const __defaultOptions: Partial<SpellRingMeshMaterialOptions> = {
  color: new Color(0xffffff),
  speed: 8,
  opacity: 1
}

export default class SpellRingMeshMaterial extends RawShaderMaterial {
  // @ts-ignore ts(2611)
  set opacity(value: number) {
    if (this.uniforms) {
      this.uniforms.opacity.value = value
    }
    this.visible = value > 0
  }
  get opacity() {
    return this.uniforms.opacity.value
  }
  set color(value: Color) {
    this.uniforms.color1.value = value
  }
  get color() {
    return this.uniforms.color1.value as Color
  }
  set state(val: boolean) {
    if (val !== this._state) {
      this._state = val
      simpleTweener.to({
        description: 'spell ring opacity',
        target: this as SpellRingMeshMaterial,
        propertyGoals: { opacity: val ? 1 : 0 },
        duration: 500
      })
    }
  }
  options: SpellRingMeshMaterialOptions
  private _state: boolean
  constructor(options: SpellRingMeshMaterialOptions) {
    options = { ...__defaultOptions, ...options }
    const uniforms: {
      [uniform: string]: IUniform<any>
    } = {
      color: new Uniform(new Color(options.color)),
      opacity: new Uniform(options.opacity),
      time: timeUniformFactory.getUniform(options.speed!)
    }

    super({
      uniforms,
      vertexShader,
      fragmentShader,
      side: FrontSide,
      transparent: true,
      depthWrite: false,
      blending: CustomBlending,
      blendSrc: OneFactor,
      blendDst: OneMinusSrcAlphaFactor,
      blendSrcAlpha: OneFactor,
      blendDstAlpha: OneMinusSrcAlphaFactor,
      blendEquation: AddEquation
    })

    this.options = options
    this._state = true
  }
  clone() {
    const clone = super.clone()
    clone.uniforms.time = this.uniforms.time
    return clone
  }
  variant(options: Partial<SpellRingMeshMaterialOptions>) {
    return new SpellRingMeshMaterial({
      ...this.options,
      ...options
    })
  }
}
