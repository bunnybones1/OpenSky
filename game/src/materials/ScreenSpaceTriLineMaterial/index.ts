import { radiansDifference } from '@opensky/shared/utils/math'
import {
  // AdditiveBlending,
  AddEquation,
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

import { renderMetricsUniforms } from '~/uniforms'

import fragmentShader from './frag.glsl'
import vertexShader from './vert.glsl'

const __tempPoint1 = new Vector2()
const __tempPoint3 = new Vector2()
const __tempDelta = new Vector2()
const __tempDelta2 = new Vector2()
const qt = Math.PI * 0.5

export interface ScreenSpaceTriLineMaterialOptions {
  point1: Vector2
  point2: Vector2
  lineLength: number
  point1Radius: number
  innerThickness: number
  outerThickness: number
  color: Color
  progressSharpness: number
  innerOpacity?: number
  outerOpacity?: number
  constantSizeOnScreen?: boolean
  prescale?: number
}

export default class ScreenSpaceTriLineMaterial extends RawShaderMaterial {
  pointsDirty: boolean
  private _point1: Vector2
  private _point2: Vector2
  private _lineLength: number
  private _point1Radius: number
  private _innerOpacity: number
  private _outerOpacity: number
  private _opacity: number

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

  set progress(value: number) {
    this.uniforms.progress.value.x = 1 - value
  }
  get progress() {
    return 1 - this.uniforms.progress.value.x
  }

  set lineLength(value: number) {
    this._lineLength = value
    this.pointsDirty = true
  }
  get lineLength() {
    return this._lineLength
  }

  set x1(value: number) {
    this._point1.x = value
    this.pointsDirty = true
  }
  get x1() {
    return this._point1.x
  }

  set y1(value: number) {
    this._point1.y = value
    this.pointsDirty = true
  }
  get y1() {
    return this._point1.y
  }

  set x2(value: number) {
    this._point2.x = value
    this.pointsDirty = true
  }
  get x2() {
    return this._point2.x
  }

  set y2(value: number) {
    this._point2.y = value
    this.pointsDirty = true
  }
  get y2() {
    return this._point2.y
  }
  constructor(options: ScreenSpaceTriLineMaterialOptions) {
    const innerOpacity =
      options.innerOpacity !== undefined ? options.innerOpacity : 1
    const outerOpacity =
      options.outerOpacity !== undefined ? options.outerOpacity : 1
    const uniforms: {
      [uniform: string]: IUniform<any>
    } = {
      clipSpacePosition: new Uniform(new Vector4()),
      color: new Uniform(options.color),
      positionsX: new Uniform(new Vector3()),
      positionsY: new Uniform(new Vector3()),
      normalsX: new Uniform(new Vector3()),
      normalsY: new Uniform(new Vector3()),
      opacities: new Uniform(new Vector3(0, outerOpacity, innerOpacity)),
      pixelSizeInClipSpace: renderMetricsUniforms.uiMetreSizeInClipSpace,
      halfThicknesses: new Uniform(
        new Vector2(options.innerThickness * 0.5, options.outerThickness * 0.5)
      ),
      progress: new Uniform(new Vector2(1, options.progressSharpness)),
      prescale: new Uniform(options.prescale || 1)
    }
    super({
      defines: {
        CONSTANT_SIZE_ON_SCREEN: options.constantSizeOnScreen
      },
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

    this._point1 = options.point1
    this._point2 = options.point2
    this._lineLength = options.lineLength
    this._point1Radius = options.point1Radius
    this.pointsDirty = true
    this._opacity = 1
    this._innerOpacity = innerOpacity
    this._outerOpacity = outerOpacity
    this.updatePoints()
  }

  updatePoints() {
    if (!this.pointsDirty) {
      return
    }
    this.pointsDirty = false

    __tempPoint3.set(this._point2.x + this.lineLength, this._point2.y)
    __tempPoint1
      .copy(this._point2)
      .sub(this._point1)
      .normalize()
      .multiplyScalar(this._point1Radius)
    this.uniforms.positionsX.value.set(
      __tempPoint1.x,
      this._point2.x,
      __tempPoint3.x
    )
    this.uniforms.positionsY.value.set(
      __tempPoint1.y,
      this._point2.y,
      __tempPoint3.y
    )

    __tempDelta.copy(this._point1).sub(this._point2)
    __tempDelta2.copy(__tempPoint3).sub(this._point2)
    const normal1 = Math.atan2(__tempDelta.y, __tempDelta.x) + qt
    const normal3 = Math.atan2(__tempDelta2.y, __tempDelta2.x) - qt
    const normal2 = normal3 + radiansDifference(normal1, normal3) * 0.5

    const hotfixNormal = 1.2
    this.uniforms.normalsX.value.set(
      Math.cos(normal1),
      Math.cos(normal2) * hotfixNormal,
      Math.cos(normal3)
    )
    this.uniforms.normalsY.value.set(
      Math.sin(normal1),
      Math.sin(normal2) * hotfixNormal,
      Math.sin(normal3)
    )
  }
}
