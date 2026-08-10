import device from '@opensky/shared/device'
import { renderMetrics } from '@opensky/shared/renderMetrics'
import { clamp, lerp } from '@opensky/shared/utils/math'
import { listenToProperty } from '@opensky/shared/utils/propertyListeners'
import { Euler, PerspectiveCamera, Quaternion, Vector3 } from 'three'

import { ARENA_ANGLE, ARENA_CAMERA_DISTANCE, ARENA_OFFSET_Y } from '~/constants'
import worldPositionCacheManager from '~/helpers/worldPositionCacheManager'
import queryParams from '~/queryParams'
import { Easing } from '~/systems/animation/Easing'
import { simpleTweener } from '~/systems/animation/tweeners'
import { reduceMotionEnabled } from '~/userSettings'

import NiceMethod from './NiceMethod'
import { getQuatFromEuler } from './threeMathUtils'

const SHAKE_CHANGE_DURATION = 0.1
const LOW_HERTZ = 200
const HIGH_HERTZ = 6000

const FOV = 35
const MOBILE_FOV = 30

interface CamSettings {
  position: Vector3
  quaternion: Quaternion
  fov: number
}

const angle = ARENA_ANGLE

export const __camSettings = {
  intro: {
    position: new Vector3(
      0,
      Math.cos(angle) * ARENA_CAMERA_DISTANCE + ARENA_OFFSET_Y,
      Math.sin(angle) * ARENA_CAMERA_DISTANCE
    ),
    quaternion: getQuatFromEuler(-0.15, 0, 0),
    fov: 50
  },
  home: {
    position: new Vector3(
      0,
      Math.cos(angle) * ARENA_CAMERA_DISTANCE + ARENA_OFFSET_Y,
      Math.sin(angle) * ARENA_CAMERA_DISTANCE
    ),
    quaternion: new Quaternion(),
    fov: device.isMobile ? MOBILE_FOV : FOV
  },
  loading: {
    position: new Vector3(
      0,
      Math.cos(angle) * ARENA_CAMERA_DISTANCE + ARENA_OFFSET_Y,
      Math.sin(angle) * ARENA_CAMERA_DISTANCE
    ),
    quaternion: getQuatFromEuler(0, 0, 0),
    fov: device.isMobile ? MOBILE_FOV : FOV
  },
  flyOut: {
    position: new Vector3(
      0,
      Math.cos(angle) * ARENA_CAMERA_DISTANCE + ARENA_OFFSET_Y + 0.2,
      Math.sin(angle) * ARENA_CAMERA_DISTANCE + 0.43
    ),
    quaternion: getQuatFromEuler(-0.4, 0, 0),
    fov: 40
  }
} as const satisfies { [id: string]: CamSettings }

class CameraShaker {
  set positionHomeBlend(val: number) {
    if (this._positionHomeBlend !== val) {
      this._positionHomeBlend = val
      this.blendCamSettings(__camSettings.intro, __camSettings.home, val)
    }
  }
  get positionHomeBlend() {
    return this._positionHomeBlend
  }
  private set shakeStrength(value: number) {
    value = clamp(value, 0, 1)
    if (value === this._shakeStrength) {
      return
    }
    this._shakeStrength = value
  }
  set shakeScale(value: number) {
    value = clamp(value, 0, 10)
    if (value === this._shakeScale) {
      return
    }
    this._shakeScale = value
  }
  set fov(val: number) {
    this._fov = val
    this.updateProjection()
  }
  get fov() {
    return this.camera.fov
  }
  set aspect(val: number) {
    this.camera.aspect = val
    this.updateProjection()
  }
  get aspect() {
    return this.camera.aspect
  }
  minAspect = (device.isTablet ? 14.5 : 13.25) / 9
  // minAspect = (!device.isMobile && isConquestIsland ? 17.5 : 13.25) / 9

  shakyCamera: PerspectiveCamera
  private _fov: number = 35
  private _viewportData: {
    fullWidth: number
    fullHeight: number
    x: number
    y: number
    width: number
    height: number
  } | null = null

  private _positionHomeBlend: number = 0
  private _time: number
  private _timers: number[]
  private _shakeStrength: number
  private _shakeScale: number
  private _viewportChangeListeners: Set<() => void> = new Set()
  private _cameraWorldPos: Vector3 | undefined
  get cameraWorldPos() {
    if (!this._cameraWorldPos) {
      this._cameraWorldPos = worldPositionCacheManager.register(this.camera)
    }
    return this._cameraWorldPos
  }

  constructor(public camera: PerspectiveCamera) {
    this._fov = camera.fov
    this._time = 0
    this._timers = []
    this._shakeScale = 0.00025
    this._shakeStrength = 0

    camera.position.copy(__camSettings.home.position)
    camera.lookAt(0, ARENA_OFFSET_Y, 0)
    camera.updateProjectionMatrix()
    __camSettings.home.quaternion.copy(camera.quaternion)
    camera.quaternion.copy(__camSettings.intro.quaternion)
    camera.position.copy(__camSettings.intro.position)

    const shakyCamera = camera.clone()
    shakyCamera.position.set(0, 0, 0)
    shakyCamera.quaternion.setFromEuler(new Euler(0, 0, 0))
    shakyCamera.scale.set(1, 1, 1)
    camera.add(shakyCamera)
    this.shakyCamera = shakyCamera
  }

  update(dt: number) {
    this._time += dt
    this.shakeStrength =
      this._shakeStrength +
      (dt / SHAKE_CHANGE_DURATION) * (this._timers.length > 0 ? 12 : -1)
    if (!reduceMotionEnabled.value && this._shakeStrength > 0) {
      this.shakyCamera.position.set(0, 0, 0)
      let octave = 1
      for (let i = LOW_HERTZ; i < HIGH_HERTZ; i *= 1.674, octave *= 0.8) {
        const overallStrength =
          (1 / octave) * this._shakeScale * this._shakeStrength
        this.shakyCamera.position.x +=
          Math.sin(this._time * i) * overallStrength
        this.shakyCamera.position.y +=
          Math.sin(this._time * i * 1.235) * overallStrength
        this.shakyCamera.position.z +=
          Math.sin(this._time * i * 1.67235) * overallStrength
      }
    }
    while (this._timers.length > 0 && this._timers[0] <= this._time) {
      this._timers.shift()
    }
  }

  add(duration: number) {
    this._timers.push(this._time + duration)
    this._timers.sort()
  }

  setViewOffset(
    fullWidth: number,
    fullHeight: number,
    x: number,
    y: number,
    width: number,
    height: number
  ) {
    this._viewportData = {
      fullWidth,
      fullHeight,
      x,
      y,
      width,
      height
    }
    this.restoreViewOffset()
    this._viewportChangeListeners.forEach(callback => callback())
  }

  clearViewOffset() {
    this.camera.clearViewOffset()
    this.shakyCamera.clearViewOffset()
  }

  restoreViewOffset() {
    if (this._viewportData) {
      this.camera.setViewOffset(
        this._viewportData.fullWidth,
        this._viewportData.fullHeight,
        this._viewportData.x,
        this._viewportData.y,
        this._viewportData.width,
        this._viewportData.height
      )
      this.shakyCamera.setViewOffset(
        this._viewportData.fullWidth,
        this._viewportData.fullHeight,
        this._viewportData.x,
        this._viewportData.y,
        this._viewportData.width,
        this._viewportData.height
      )
    }
  }

  nestViewOffset(
    targetCamera: PerspectiveCamera,
    fullWidth: number,
    fullHeight: number,
    x: number,
    y: number,
    width: number,
    height: number
  ) {
    if (!this._viewportData) {
      return
    }
    const prescaleX = this._viewportData.width / this._viewportData.fullWidth
    const prescaleY = this._viewportData.height / this._viewportData.fullHeight
    const scaleX = fullWidth / this._viewportData.fullWidth
    const scaleY = fullHeight / this._viewportData.fullHeight
    targetCamera.setViewOffset(
      fullWidth,
      fullHeight,
      x * prescaleX + this._viewportData.x * scaleX,
      y * prescaleY + this._viewportData.y * scaleY,
      width * prescaleX,
      height * prescaleY
    )
  }

  onViewportChange(listener: () => void, firstOneFree = true) {
    this._viewportChangeListeners.add(listener)
    if (firstOneFree) {
      listener()
    }

    return () => {
      this._viewportChangeListeners.delete(listener)
    }
  }
  animateOut(duration: number) {
    const animVal = { val: 0 }
    simpleTweener.to({
      description: 'shaky cam anim out',
      delay: 2000,
      target: animVal,
      propertyGoals: { val: 1 },
      duration,
      easing: v => lerp(v, Easing.Quartic.InOut(v), 0.2),
      onUpdate: () => {
        this.blendCamSettings(
          __camSettings.home,
          __camSettings.flyOut,
          animVal.val
        )
      }
    })
  }
  blendCamSettings(a: CamSettings, b: CamSettings, amt: number) {
    this.camera.position.copy(a.position).lerp(b.position, amt)
    this.camera.quaternion.copy(a.quaternion).slerp(b.quaternion, amt)
    this.fov = lerp(a.fov, b.fov, amt)
  }

  private updateProjection() {
    const limitedAspect = Math.max(1.25, this.aspect)
    const adjustedFov =
      limitedAspect > this.minAspect
        ? this._fov
        : (this._fov * this.minAspect) / limitedAspect
    this.camera.fov = lerp(this._fov, adjustedFov, this._positionHomeBlend)
    this.camera.updateProjectionMatrix()
    this.shakyCamera.fov = this.camera.fov
    this.shakyCamera.aspect = this.camera.aspect
    this.shakyCamera.updateProjectionMatrix()
  }
}

const fov = __camSettings.intro.fov

const camera = new PerspectiveCamera(fov, renderMetrics.aspect, 0.01, 10.4)

export const cameraShaker = new CameraShaker(camera)

new NiceMethod(
  'pan out',
  () => {
    cameraShaker.animateOut(1000 * queryParams.dayLength * 2.0)
  },
  'camera fly out',
  'never'
)

listenToProperty(renderMetrics, 'aspect', v => (cameraShaker.aspect = v))
