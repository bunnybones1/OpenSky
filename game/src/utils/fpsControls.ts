import { clamp, lerp } from '@opensky/shared/utils/math'
import { PerspectiveCamera } from 'three'
import FPSController from 'threejs-camera-controller-first-person-desktop'

import queryParams from '~/queryParams'
import renderer from '~/renderer'
import UpdateManager from '~/systems/UpdateManager'

import { cameraShaker } from './cameraShaker'
import { copyTransform } from './transformUtils'

const FPS_CAMERA_DAMPING = queryParams.camDamping
const FPS_CAMERA_LERP_STRENGTH = 1 - clamp(FPS_CAMERA_DAMPING, 0, 1)

function copyCam(dst: PerspectiveCamera, src: PerspectiveCamera) {
  copyTransform(dst, src)
  dst.fov = src.fov
}

export class FPSControls {
  private _active = false
  get active() {
    return this._active
  }
  private _cameraLocal: PerspectiveCamera
  private _fpsController: FPSController | undefined = undefined
  constructor(private _camera: PerspectiveCamera) {
    //
  }
  toggle(state?: boolean) {
    if (state === undefined) {
      state = !this._active
    }
    if (!this._fpsController) {
      this._cameraLocal = new PerspectiveCamera()
      copyCam(this._cameraLocal, this._camera)
      this._camera.parent!.add(this._cameraLocal)
      this._fpsController = new FPSController(
        this._cameraLocal,
        renderer.domElement,
        {
          movementSpeed: 0.0025
        }
      )
      UpdateManager.register(this)
      // setInterval(() => {
      //   cameraShaker.add(0.025)
      // }, 2000)
    }
    if (state) {
      this._fpsController.lock()
    } else {
      this._fpsController.unlock()
    }
    // debugger
    this._active = state
  }
  update() {
    if (this._active && this._fpsController) {
      this._fpsController.update()
      this._camera.position.lerp(
        this._cameraLocal.position,
        FPS_CAMERA_LERP_STRENGTH
      )
      this._camera.quaternion.slerp(
        this._cameraLocal.quaternion,
        FPS_CAMERA_LERP_STRENGTH
      )
      this._camera.scale.lerp(this._cameraLocal.scale, FPS_CAMERA_LERP_STRENGTH)
      // this._camera.matrix.copy(this._cameraLocal.matrix)
      this._camera.fov = lerp(
        this._camera.fov,
        this._cameraLocal.fov,
        FPS_CAMERA_LERP_STRENGTH
      )
      cameraShaker.fov = this._camera.fov
    }
  }
}

const fpsControls = new FPSControls(cameraShaker.camera)

export default fpsControls
