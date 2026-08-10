import { Camera, Object3D, Quaternion } from 'three'

import { ARENA_ANGLE_QUAT, INV_ARENA_ANGLE_QUAT } from '~/constants'
import parallaxInput, {
  SoftQuaternionListener
} from '~/systems/input/parallaxInput'
import { parallaxStrength } from '~/userSettings'

type QuaternionListener = (q: Quaternion) => void
type StrengthMaker = (s: number) => number
class SoftParallaxController {
  softQuatListener: SoftQuaternionListener | undefined
  constructor(
    public quatListener: QuaternionListener,
    public strengthMaker: StrengthMaker
  ) {
    //
  }
}
const strengthPassthrough: StrengthMaker = s => s

const softParallaxControllers: SoftParallaxController[] = []

const PARALLAX_EXPERT_STRENGTH = 10.1
export function registerParallaxListener(
  quatListener: QuaternionListener,
  strMaker = strengthPassthrough
) {
  const c = new SoftParallaxController(quatListener, strMaker)
  softParallaxControllers.push(c)
  if (usingParallax) {
    const s = parallaxStrength.value * PARALLAX_EXPERT_STRENGTH
    c.softQuatListener = parallaxInput.addListener(
      c.quatListener,
      c.strengthMaker(s)
    )
  }
}

let usingParallax = false
parallaxStrength.listen(s => {
  s *= PARALLAX_EXPERT_STRENGTH
  const shouldUseParallax = s > 0
  if (usingParallax && !shouldUseParallax) {
    for (const c of softParallaxControllers) {
      if (c.softQuatListener) {
        parallaxInput.removeListener(c.quatListener)
        c.softQuatListener = undefined
      }
    }
    usingParallax = false
  } else if (!usingParallax && shouldUseParallax) {
    for (const c of softParallaxControllers) {
      c.softQuatListener = parallaxInput.addListener(
        c.quatListener,
        c.strengthMaker(s)
      )
    }
    usingParallax = true
  } else if (usingParallax) {
    for (const c of softParallaxControllers) {
      c.softQuatListener!.strength = c.strengthMaker(s)
    }
  }
})

const __identiyQuat = new Quaternion()
class CameraParallaxHelper {
  set paused(pause: boolean) {
    if (this._paused !== pause) {
      this._paused = pause
      if (pause) {
        this._applyQuat(__identiyQuat)
      } else {
        this._applyQuat(this._lastParallaxQuaternion)
      }
    }
  }

  private _cameraParallaxInitd = false
  private _camNode: Object3D | undefined
  private _lastParallaxQuaternion = new Quaternion()

  private _paused = false
  attemptToRigCameraParallax(camera: Camera) {
    if (this._cameraParallaxInitd) {
      console.warn('cannot rig multiple cameras with parallax')
      return
    }
    this._cameraParallaxInitd = true
    this._camNode = new Object3D()
    camera.parent?.add(this._camNode)
    this._camNode.add(camera)
    registerParallaxListener(this._onParallaxCamera, s => -s)
  }
  pause() {
    this.paused = true
  }
  unpause() {
    this.paused = false
  }

  private _onParallaxCamera = (quaternion: Quaternion) => {
    this._lastParallaxQuaternion.copy(quaternion)
    if (!this._paused) {
      this._applyQuat(quaternion)
    }
  }
  private _applyQuat(q: Quaternion) {
    const c = this._camNode
    if (c) {
      c.quaternion.copy(q)
      c.quaternion.premultiply(INV_ARENA_ANGLE_QUAT)
      c.quaternion.multiply(ARENA_ANGLE_QUAT)
      c.updateMatrix()
      c.updateMatrixWorld()
    }
  }
}

export const cameraParallaxHelper = new CameraParallaxHelper()
