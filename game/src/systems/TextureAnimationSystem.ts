import { TextureAssetName } from '@opensky/shared/assets'
import { removeFromArray } from '@opensky/shared/utils/arrayUtils'
import { clamp, fract, pingPong } from '@opensky/shared/utils/math'
import { EntityManager, System } from 'gg'
import {
  IUniform,
  RawShaderMaterial,
  ShaderMaterialParameters,
  Uniform,
  Vector4
} from 'three'

import { AssetsManager } from '~/assets/index'
import { Components } from '~/components'

export enum PlayMode {
  Loop,
  PingPong,
  Once
}

type FrameConverter = (frame: number) => number

interface TextureAnimationOptions {
  assetsManager: AssetsManager
  map: TextureAssetName
  rows: number
  columns: number
  fps: number
  playMode?: PlayMode
  direction?: 1 | -1
  opacity?: number
  materialOptions?: ShaderMaterialParameters
}

export class TextureAnimation {
  get opacity() {
    return this._opacityUniform.value
  }

  set opacity(value: number) {
    this._opacityUniform.value = value
  }

  set time(val: number) {
    this._time = val
    const frame = Math.round(this._time / this._frameDuration)
    this.frame = this._frameConverter(frame)
  }

  get time() {
    return this._time
  }

  private set frame(val: number) {
    if (this._frame === val) {
      return
    }
    this._frame = val

    this._mapST.z = fract(val, this.options.columns)
    this._mapST.w =
      Math.floor(val / this.options.columns) / this.options.rows - this._mapST.y
  }

  static members: TextureAnimation[] = []
  material: RawShaderMaterial
  private _time: number
  private _frame: number

  private _totalFrames: number
  private _frameDuration: number
  private _direction: 1 | -1
  private _isPlaying: boolean
  private _opacityUniform: IUniform
  private _mapST: Vector4

  private _frameConverter: FrameConverter

  constructor(private options: TextureAnimationOptions) {
    const opacity = new Uniform(
      typeof options.opacity === 'number' ? options.opacity : 1
    )
    const mapST = new Vector4(1 / options.columns, -1 / options.rows, 0, 0)
    const uniforms: { [uniform: string]: IUniform<any> } = {
      map: options.assetsManager.getLazyTextureAssetUniform(options.map),
      mapST: new Uniform(mapST),
      opacity
    }

    this.material = new RawShaderMaterial({
      ...options.materialOptions,
      vertexShader,
      fragmentShader,
      uniforms,
      transparent: true,
      depthWrite: false
    })

    this._opacityUniform = opacity

    this._time = 0

    this.options = options
    this._totalFrames = options.rows * options.columns
    this._isPlaying = false
    this._frameDuration = 1 / options.fps
    this._mapST = mapST
    this._direction = options.direction || 1
    this._frameConverter = this.getCorrectFrameConverter(options.playMode)
    this.start()

    TextureAnimation.members.push(this)
  }

  variant() {
    return new TextureAnimation(this.options)
  }

  updateAnimation(dt: number) {
    if (this._isPlaying) {
      this.time += dt * this._direction
    }
  }

  start() {
    this.time =
      this._direction === 1 ? 0 : this._totalFrames * this._frameDuration

    this.play()
  }

  stop() {
    this.pause()
  }

  play() {
    this._isPlaying = true
  }

  pause() {
    this._isPlaying = false
  }

  dispose() {
    removeFromArray(TextureAnimation.members, this)
  }

  private getCorrectFrameConverter(playMode = PlayMode.Loop) {
    switch (playMode) {
      case PlayMode.Loop:
        return this.frameConverterLoop
      case PlayMode.PingPong:
        return this.frameConverterPingPong
      case PlayMode.Once:
        return this.frameConverterOnce
    }
  }

  private frameConverterLoop(frame: number) {
    return frame % this._totalFrames
  }

  private frameConverterPingPong(frame: number) {
    return pingPong(frame, 0, this._totalFrames - 1)
  }

  private frameConverterOnce(frame: number) {
    return clamp(frame, 0, this._totalFrames - 1)
  }
}

export default class TextureAnimationSystem extends System<Components> {
  update(manager: EntityManager<Components>, dt: number) {
    for (const ta of TextureAnimation.members) {
      ta.updateAnimation(dt)
    }
  }
}

const vertexShader = `
attribute vec2 uv;
attribute vec4 position;

uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
uniform vec4 mapST;

varying vec2 vUV;

void main() {
  vUV = uv * mapST.xy + mapST.zw;
  gl_Position = projectionMatrix * modelViewMatrix * position;
}
`

const fragmentShader = `
precision highp float;

varying vec2 vUV;

uniform sampler2D map;
uniform float opacity;

void main() {
  vec4 color = texture2D(map, vUV);
  gl_FragColor = vec4(color.rgb, color.a * opacity);
}
`
