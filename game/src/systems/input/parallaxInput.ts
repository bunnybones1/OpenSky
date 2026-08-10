import device from '@opensky/shared/device'
import renderController from '@opensky/shared/renderController'
import { renderMetrics } from '@opensky/shared/renderMetrics'
import { DEGREES_TO_RADIANS } from '@opensky/shared/utils/math'
import { Euler, Quaternion } from 'three'

import { useOrientationSensorForParallax } from '~/userSettings'
import { taskTimer } from '~/utils/taskTimer'
import { getQuatFromEuler } from '~/utils/threeMathUtils'

import UpdateManager from '../UpdateManager'
import inputProvider from './input'

const DEG_RATE_TO_RAD = DEGREES_TO_RADIANS / 60

type QuaternionListener = (q: Quaternion) => void
const __identityQuaternion = new Quaternion()
export class SoftQuaternionListener {
  quaternion = new Quaternion()
  constructor(
    private _listener: QuaternionListener,
    public strength: number
  ) {
    //
  }
  update(quaternion: Quaternion) {
    this.quaternion.copy(__identityQuaternion).slerp(quaternion, this.strength)
    this._listener(this.quaternion)
  }
}

const __sensorLerpRateFast = 0.15
const __sensorLerpRateSlow = 0.005
const __mouseLerpRate = 0.05
const __idealFrameDuration = 1 / 60
const __mouseStrength = 0.4

interface IOrientationEvent {
  alpha: number | null
  beta: number | null
  gamma: number | null
}

const __tempQuaternion = new Quaternion()
const __tempEuler = new Euler()
const quatReorientVertical = getQuatFromEuler(-Math.PI * 0.75, 0, 0)

const quatReorientHorizontalGammaNeg = getQuatFromEuler(-Math.PI * 0.25, 0, 0)

const quatReorientHorizontalGammaPos = getQuatFromEuler(-Math.PI * 0.75, 0, 0)

class ParallaxInput {
  private set listeningToDevice(val: boolean) {
    if (
      !useOrientationSensorForParallax.value ||
      this._listeningToDevice === val
    ) {
      return
    }
    this._listeningToDevice = val
    if (val) {
      window.addEventListener('devicemotion', this.onMotion, false)
      window.addEventListener('deviceorientation', this.onOrientation, false)
      // window.addEventListener(
      //   'deviceorientationabsolute',
      //   this.onOrientation,
      //   false
      // )
    } else {
      window.removeEventListener('devicemotion', this.onMotion, false)
      window.removeEventListener('deviceorientation', this.onOrientation, false)
      // window.removeEventListener(
      //   'deviceorientationabsolute',
      //   this.onOrientation,
      //   false
      // )
    }
  }
  private set listenerCount(val: number) {
    if (this._listenerCount === 0 && val > 0) {
      this._startInputDevices()
    } else if (this._listenerCount > 0 && val === 0) {
      this._stopInputDevices()
    }
    this._listenerCount = val
  }

  protected _listeners: QuaternionListener[] = []
  protected _softListeners: SoftQuaternionListener[] = []
  private _initOrienationReceived: boolean
  private _orientationBlocker = true
  private _horizontalDirection: 1 | -1 = 1
  private _verticalDirection: 1 | -1 = 1
  private _decidedSensor: 'motion' | 'orientation' | undefined
  private _listeningToDevice: boolean
  private quaternion = new Quaternion()
  private hardwareSensorQuaternion = new Quaternion()
  private fastSensorQuaternion = new Quaternion()
  private slowSensorQuaternion = new Quaternion()
  private hardwareMouseQuaternion = new Quaternion()
  private mouseQuaternion = new Quaternion()
  private mouseEuler = new Euler()
  private verticalOrientation = true
  private _listenerCount = 0
  private stopDeviceListener: () => boolean
  private integratedEuler = new Euler()
  reset() {
    this.fastSensorQuaternion.copy(this.hardwareSensorQuaternion)
    this.slowSensorQuaternion.copy(this.hardwareSensorQuaternion)
    this.integratedEuler.set(0, 0, 0)
  }

  update(dt: number) {
    const adjDt = dt / __idealFrameDuration
    const mouseLerpAmt = 1 - Math.pow(1 - __mouseLerpRate, adjDt)
    if (this._initOrienationReceived) {
      const fastSensorLerpAmt = 1 - Math.pow(1 - __sensorLerpRateFast, adjDt)
      const slowSensorLerpAmt = 1 - Math.pow(1 - __sensorLerpRateSlow, adjDt)
      const eulerFade = 1 - slowSensorLerpAmt
      this.integratedEuler.x *= eulerFade
      this.integratedEuler.y *= eulerFade
      this.integratedEuler.z *= eulerFade
      this.fastSensorQuaternion.slerp(
        this.hardwareSensorQuaternion,
        fastSensorLerpAmt
      )
      this.slowSensorQuaternion.slerp(
        this.hardwareSensorQuaternion,
        slowSensorLerpAmt
      )
    }
    this.mouseQuaternion.slerp(this.hardwareMouseQuaternion, mouseLerpAmt)
    this.quaternion
      .copy(this.slowSensorQuaternion)
      .invert()
      .premultiply(this.fastSensorQuaternion)
    this.quaternion.invert()
    this.quaternion.premultiply(this.mouseQuaternion)

    for (const sl of this._softListeners) {
      sl.update(this.quaternion)
    }
  }

  addListener(listener: QuaternionListener, strength: number) {
    this._listeners.push(listener)
    const softQuaternionListener = new SoftQuaternionListener(
      listener,
      strength
    )
    this._softListeners.push(softQuaternionListener)
    this.listenerCount = this._listeners.length
    return softQuaternionListener
  }
  removeListener(listener: QuaternionListener) {
    const index = this._listeners.indexOf(listener)
    if (index !== -1) {
      this._listeners.splice(index, 1)
      this._softListeners.splice(index, 1)
      this.listenerCount = this._listeners.length
    }
  }
  private _onDeviceResize = () => {
    if (this.verticalOrientation !== device.aspect < 1) {
      this.verticalOrientation = device.aspect < 1
      this.reset()
    }
  }
  private onInteractAttemptDeviceOrientation = async () => {
    if (
      'DeviceOrientationEvent' in window &&
      typeof (DeviceOrientationEvent as any).requestPermission === 'function'
    ) {
      this.onReceivePermission(
        await (window.DeviceOrientationEvent as any).requestPermission()
      )
      window.removeEventListener(
        'touchend',
        this.onInteractAttemptDeviceOrientation
      )
      window.removeEventListener(
        'click',
        this.onInteractAttemptDeviceOrientation
      )
    }
  }
  private onPressAttemptDeviceMotion = async () => {
    if (
      'DeviceMotionEvent' in window &&
      typeof (DeviceMotionEvent as any).requestPermission === 'function'
    ) {
      this.onReceivePermission(
        await (window.DeviceMotionEvent as any).requestPermission()
      )
      window.removeEventListener('touchend', this.onPressAttemptDeviceMotion)
      window.removeEventListener('click', this.onPressAttemptDeviceMotion)
    }
  }
  private onReceivePermission(permissionState: PermissionState) {
    if (permissionState === 'granted') {
      this.listeningToDevice = true
    }
  }
  private _startInputDevices() {
    if (!location.href.startsWith('https')) {
      console.warn(
        'Orientation sensor will only work in https (' + location.href + ')'
      )
    }
    inputProvider.onMove.addListener(this._onMouseMove)
    this.stopDeviceListener = device.onChange(this._onDeviceResize, true)
    if (!useOrientationSensorForParallax.value) {
      return
    }
    // feature detect
    let anyPermissionsRequested = false
    if (
      'DeviceOrientationEvent' in window &&
      typeof (DeviceOrientationEvent as any).requestPermission === 'function'
    ) {
      window.addEventListener(
        'touchend',
        this.onInteractAttemptDeviceOrientation
      )
      window.addEventListener('click', this.onInteractAttemptDeviceOrientation)
      anyPermissionsRequested = true
    }
    if (
      'DeviceMotionEvent' in window &&
      typeof (DeviceMotionEvent as any).requestPermission === 'function'
    ) {
      window.addEventListener('touchend', this.onPressAttemptDeviceMotion)
      window.addEventListener('click', this.onPressAttemptDeviceMotion)
      anyPermissionsRequested = true
    }
    if (!anyPermissionsRequested) {
      // try using device sensors naively
      this.listeningToDevice = true
    }
    taskTimer.add(() => (this._orientationBlocker = false), 2.5)
  }
  private onMotion = (event: DeviceMotionEvent) => {
    if (event.rotationRate) {
      if (!this._decidedSensor) {
        this._decidedSensor = 'motion'
      }
      if (this._decidedSensor !== 'motion') {
        return
      }
      this.processMotionRotation(event.rotationRate)
    }
  }
  private onOrientation = (event: DeviceOrientationEvent) => {
    if (!this._decidedSensor && !this._orientationBlocker) {
      this._decidedSensor = 'orientation'
    }

    const v = this.verticalOrientation ? event.beta || 0 : event.gamma || 0
    const h = this.verticalOrientation ? -(event.beta || 0) : event.gamma || 0
    this._verticalDirection = v > 0 ? 1 : -1
    this._horizontalDirection = h > 0 ? 1 : -1
    if (this._decidedSensor !== 'orientation') {
      return
    }
    this.processOrientation(event)
  }
  private processMotionRotation(event: IOrientationEvent) {
    const a = (event.alpha || 0) * DEG_RATE_TO_RAD
    const b = (event.beta || 0) * DEG_RATE_TO_RAD
    const h = this.verticalOrientation ? b : a
    const v = this.verticalOrientation ? a : b
    this.integratedEuler.y += h * this._horizontalDirection
    this.integratedEuler.x += v * this._verticalDirection
    const q = this.hardwareSensorQuaternion
    q.set(0, 0, 0, 1)
    q.multiply(
      __tempQuaternion.setFromEuler(
        __tempEuler.set(this.integratedEuler.x, 0, 0)
      )
    )
    q.multiply(
      __tempQuaternion.setFromEuler(
        __tempEuler.set(0, this.integratedEuler.y, 0)
      )
    )
    if (!this._initOrienationReceived) {
      this.reset()
      this._initOrienationReceived = true
    }
  }
  private processOrientation(event: IOrientationEvent) {
    //gamma 90 correlates with top wide edge pointing at sky
    //beta 0 correlates with top narrow edge pointing at the horizon
    //alpha correlates with arbitrary spin on y axis like a top
    const a = (event.alpha || 0) * DEGREES_TO_RADIANS
    const b = (event.beta || 0) * DEGREES_TO_RADIANS
    const g = (event.gamma || 0) * DEGREES_TO_RADIANS
    let v = this.verticalOrientation ? b : g
    if (v < 0) {
      v *= -1
    }
    const q = this.hardwareSensorQuaternion
    q.set(0, 0, 0, 1)
    q.multiply(__tempQuaternion.setFromEuler(__tempEuler.set(-v, 0, 0)))
    const quatReorient = this.verticalOrientation
      ? quatReorientVertical
      : v > 0
      ? quatReorientHorizontalGammaPos
      : quatReorientHorizontalGammaNeg
    q.multiply(quatReorient)
    q.multiply(__tempQuaternion.setFromEuler(__tempEuler.set(0, 0, a)))
    q.multiply(__tempQuaternion.copy(quatReorient).invert())
    if (!this._initOrienationReceived) {
      this.reset()
      this._initOrienationReceived = true
    }
  }
  private _stopInputDevices() {
    inputProvider.onMove.removeListener(this._onMouseMove)
    if (this.stopDeviceListener) {
      this.stopDeviceListener()
    }
    this.listeningToDevice = false
  }

  private _onMouseMove = (x: number, y: number) => {
    if (
      !renderController.active ||
      renderMetrics.width === 0 ||
      renderMetrics.height === 0
    ) {
      return
    }
    if (x < 0 || y < 0) {
      x = renderMetrics.width * 0.5
      y = renderMetrics.height * 0.5
    }
    this.mouseEuler.set(
      (y / renderMetrics.height - 0.5) * __mouseStrength,
      (x / renderMetrics.width - 0.5) * -__mouseStrength,
      0
    )
    this.hardwareMouseQuaternion.setFromEuler(this.mouseEuler).invert()
  }
}

const parallaxInput = new ParallaxInput()
UpdateManager.register(parallaxInput)
export default parallaxInput
