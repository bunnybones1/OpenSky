import {
  AddEquation,
  // AdditiveBlending,
  Color,
  CustomBlending,
  IUniform,
  OneFactor,
  OneMinusSrcAlphaFactor,
  RawShaderMaterial,
  Uniform,
  Vector2,
  Vector3,
  Vector4
} from 'three'

import { simpleTweener } from '~/systems/animation/tweeners'
import { renderMetricsUniforms } from '~/uniforms'

import fragmentShader from './frag.glsl'
import vertexShader from './vert.glsl'

export interface ScreenSpaceRingGlowingMaterialOptions {
  radius: number
  innerThickness: number
  outerThickness: number
  color: Color
  progressSharpness: number
  innerOpacity?: number
  outerOpacity?: number
  constantSizeOnScreen?: boolean
  angle?: number
  prescale: number
  progress?: number
  targetProgress?: number
  willNeedAngle?: boolean
  transitionDuration?: number
}

export default class ScreenSpaceRingGlowingMaterial extends RawShaderMaterial {
  private _colorUniform: Uniform
  get color(): Color {
    return this._colorUniform.value
  }
  set color(value: Color) {
    this._colorUniform.value = value
  }
  // @ts-ignore ts(2611)
  set opacity(value: number) {
    this._opacity = value
    if (this.uniforms) {
      this.uniforms.opacities.value.set(
        0,
        value * this._outerOpacity,
        value * this._innerOpacity
      )
    }
  }

  get opacity() {
    return this._opacity
  }
  set angle(a: number) {
    if (this._angle !== a && this._rotation2DMatrix) {
      this._angle = a
      const s = Math.sin(a)
      const c = Math.cos(a)
      const mat2 = this._rotation2DMatrix
      mat2[0] = c
      mat2[1] = -s
      mat2[2] = s
      mat2[3] = c
    }
  }

  get angle() {
    return this._angle
  }
  set targetProgress(val: number) {
    if (this._targetProgress !== val) {
      this._targetProgress = val
      simpleTweener.to({
        description: 'ring glow progress',
        target: this as ScreenSpaceRingGlowingMaterial,
        propertyGoals: { progress: val },
        duration: this._transitionDuration
      })
    }
  }
  set progress(value: number) {
    if (value !== this._progress) {
      this._progress = value
      this.uniforms.progress.value.x = value - 1 / this.progressSharpness
    }
  }
  get progress() {
    return this._progress
  }

  set progressSharpness(value: number) {
    this.uniforms.progress.value.y = value
  }
  get progressSharpness() {
    return this.uniforms.progress.value.y
  }
  private _innerOpacity: number
  private _outerOpacity: number
  private _opacity: number
  private _rotation2DMatrix: number[] | undefined
  private _transitionDuration: number

  private _angle: number

  private _targetProgress: number

  private _progress: number
  constructor(options: ScreenSpaceRingGlowingMaterialOptions) {
    const innerOpacity =
      options.innerOpacity !== undefined ? options.innerOpacity : 1
    const outerOpacity =
      options.outerOpacity !== undefined ? options.outerOpacity : 1
    const colorUniform = new Uniform(options.color)
    const uniforms: {
      [uniform: string]: IUniform<any>
    } = {
      clipSpacePosition: new Uniform(new Vector4()),
      color: colorUniform,
      radius: new Uniform(options.radius),
      opacities: new Uniform(new Vector3(0, outerOpacity, innerOpacity)),
      pixelSizeInClipSpace: renderMetricsUniforms.uiMetreSizeInClipSpace,
      halfThicknesses: new Uniform(
        new Vector2(options.innerThickness * 0.5, options.outerThickness * 0.5)
      ),
      progress: new Uniform(
        new Vector2(
          options.progress === undefined ? 1 : options.progress,
          options.progressSharpness
        )
      ),
      prescale: new Uniform(options.prescale)
    }
    const defines = {
      CONSTANT_SIZE_ON_SCREEN: options.constantSizeOnScreen,
      USE_ROTATION2D: false
    }
    const a = options.angle || 0
    let rotation2DMatrix: number[] | undefined
    if (options.willNeedAngle || a !== 0) {
      const s = Math.sin(a)
      const c = Math.cos(a)
      rotation2DMatrix = [c, -s, s, c]
      uniforms.rotation2DMatrix = new Uniform(rotation2DMatrix)
      defines.USE_ROTATION2D = true
    }
    super({
      defines,
      vertexShader,
      fragmentShader,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      // blending: AdditiveBlending,
      blending: CustomBlending,
      blendSrc: OneFactor,
      blendDst: OneMinusSrcAlphaFactor,
      blendSrcAlpha: OneFactor,
      blendDstAlpha: OneMinusSrcAlphaFactor,
      blendEquation: AddEquation,
      // wireframe: true,
      uniforms
    })

    this._rotation2DMatrix = rotation2DMatrix
    this._angle = a
    this._transitionDuration = options.transitionDuration || 2000
    this._progress = 0
    this._targetProgress = 0
    this.targetProgress =
      options.targetProgress === undefined ? 1 : options.targetProgress

    this._innerOpacity = innerOpacity
    this._outerOpacity = outerOpacity
    this._colorUniform = colorUniform
    this.color = options.color
  }
}
