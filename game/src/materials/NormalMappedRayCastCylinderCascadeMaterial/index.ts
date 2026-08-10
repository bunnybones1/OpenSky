import {
  AdditiveBlending,
  Box2,
  Color,
  DoubleSide,
  IUniform,
  RawShaderMaterial,
  ShaderMaterialParameters,
  Texture,
  Uniform,
  Vector2,
  Vector3,
  Vector4
} from 'three'

import { testOverdraw } from '~/renderSettings'
import { standardTimeUniform, timeUniformFactory } from '~/timeUniforms'
import { aspectRatioUniform, renderMetricsUniforms } from '~/uniforms'

import fragmentShader from './frag.glsl'
import vertexShader from './vert.glsl'

export default class NormalMappedRayCastCylinderCascadeMaterial extends RawShaderMaterial {
  private _uCloudsWidth: Uniform
  private _uCloudsOffsetX: Uniform
  private _uMapTexture: Uniform
  private _uNormalTexture: Uniform
  set cloudsWidth(value: number) {
    this._uCloudsWidth.value = value
  }
  set cloudsOffsetX(value: number) {
    this._uCloudsOffsetX.value = value
  }

  set altitude(val: number) {
    this._uAltitude.value = val
  }

  set uvScale(val: number) {
    this._uUvScale.value = val
  }

  set layerOffset(val: Vector3) {
    this._uLayerOffset.copy(val)
  }

  set bendDir(val: Vector3) {
    this._uBendDir.copy(val)
  }

  set depthNear(val: number) {
    this._depthNear = val
    this._updateDepthDefines()
  }

  set depthFar(val: number) {
    this._depthFar = val
    this._updateDepthDefines()
  }

  set depthLayers(val: number) {
    this.defines.MAX_DEPTH_INDEX = Math.min(Math.max(Math.round(val), 2), 16)
    this._updateDepthDefines()
  }
  updateProgress: (progress: number) => void
  private _scrollSpeed: number
  set scrollSpeed(value: number) {
    if (this._scrollSpeed !== value) {
      this._scrollSpeed = value
      this.uniforms.scrollAmount = timeUniformFactory.getUniform(value)
    }
  }
  get scrollSpeed() {
    return this._scrollSpeed
  }
  private _depthNear: number
  private _depthFar: number
  private _uAltitude: Uniform
  private _mapTextureSize: Vector2
  private _pixelSubregion: Box2
  private _uLayerOffset: Vector3
  private _uBendDir: Vector3
  private _uUvScale: IUniform

  constructor(
    normalTexture: Texture,
    mapTexture: Texture,
    mapTextureSize: Vector2,
    pixelSubregion: Box2,
    scrollSpeed: number = 0.1
  ) {
    const psrTopLeft = pixelSubregion.min.clone()
    const psrSize = new Vector2()
    pixelSubregion.getSize(psrSize)
    psrTopLeft.divide(mapTextureSize)
    psrSize.divide(mapTextureSize)
    const xyT_zwS = new Vector4(
      1 - psrTopLeft.x,
      psrTopLeft.y,
      -psrSize.x,
      psrSize.y
    )

    const clipSpaceDepth = 0.172
    const uZW = new Vector2(clipSpaceDepth, clipSpaceDepth + 0.002)
    const uLayerOffset = new Vector3()
    const uBendDir = new Vector3()
    const uUvScale = new Uniform(1)
    const uAltitude = new Uniform(1)
    const uCloudsWidth = new Uniform(6.3)
    const uCloudsOffsetX = new Uniform(-3.15)

    const uMapTexture = new Uniform(mapTexture)
    const uNormalTexture = new Uniform(normalTexture)

    const uniforms: {
      [uniform: string]: IUniform<any>
    } = {
      time: standardTimeUniform,
      scrollAmount: timeUniformFactory.getUniform(scrollSpeed),
      uCloudsWidth,
      uCloudsOffsetX,
      halfScreenWidth: renderMetricsUniforms.halfScreenWidthPixels,
      aspectRatio: aspectRatioUniform,
      fogColor: new Uniform(new Color(0x00ff00)),
      fogNear: new Uniform(0),
      fogFar: new Uniform(1),
      mapTexture: uMapTexture,
      normalTexture: uNormalTexture,
      xyT_zwS: new Uniform(xyT_zwS),
      alphaTest: new Uniform(0.5),
      uZW: new Uniform(uZW),
      uLayerOffset: new Uniform(uLayerOffset),
      uBendDir: new Uniform(uBendDir),
      uAltitude,
      uUvScale
    }
    const defines: any = {
      USE_FOG: true,
      FAR_DEPTH: '2.0',
      NEAR_DEPTH: '-1.0',
      MAX_DEPTH_INDEX: 8
    }
    const params: ShaderMaterialParameters = {
      defines,
      fog: true,
      vertexShader,
      fragmentShader,
      uniforms,
      depthWrite: true,
      transparent: false,
      side: DoubleSide,
      needsInverseModelMatrix: true
    }
    if (testOverdraw.value) {
      defines.TEST_OVERDRAW = true
      params.blending = AdditiveBlending
    }
    super(params)
    this._mapTextureSize = mapTextureSize
    this._pixelSubregion = pixelSubregion
    this.scrollSpeed = scrollSpeed
    this._uLayerOffset = uLayerOffset
    this._uBendDir = uBendDir
    this._uUvScale = uUvScale
    this._uAltitude = uAltitude

    this._uCloudsWidth = uCloudsWidth
    this._uCloudsOffsetX = uCloudsOffsetX

    this._uMapTexture = uMapTexture
    this._uNormalTexture = uNormalTexture
  }
  clone(): this {
    return new NormalMappedRayCastCylinderCascadeMaterial(
      this._uNormalTexture.value,
      this._uMapTexture.value,
      this._mapTextureSize,
      this._pixelSubregion,
      this.scrollSpeed
    ) as this
  }

  private _updateDepthDefines() {
    const low = Math.min(this._depthNear, this._depthFar)
    const high = Math.max(this._depthNear, this._depthFar)
    this.defines.NEAR_DEPTH = low.toPrecision(4)
    this.defines.FAR_DEPTH = high.toPrecision(4)
    this.needsUpdate = true
  }
}
