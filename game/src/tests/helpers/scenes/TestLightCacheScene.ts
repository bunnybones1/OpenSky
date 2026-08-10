import { RESET_USER_SETTINGS_TO_DEFAULTS } from '@opensky/shared/userSettings'
import { distributions } from '@opensky/shared/utils/distributions'
import { lerp, rand2 } from '@opensky/shared/utils/math'
import NiceFloatParameter from '@opensky/shared/utils/NiceFloatParameter'
import {
  Color,
  DirectionalLight,
  Mesh,
  Object3D,
  PerspectiveCamera,
  Vector3
} from 'three'

import Slider from '~/scenes/ui/components/Slider'
import inputProvider from '~/systems/input/input'
import { makeBallAt } from '~/tests/helpers/utils/lightCacheTestBallMakers'
import { registerDebugModalCategory } from '~/utils/registerDebugModalCategory'

import { addPrettyLights } from '../utils/lights'
import { BaseTestScene } from './BaseTestScene'
const ZERO = new Vector3()

export class TestLightCacheScene extends BaseTestScene {
  private ringBase: Object3D | undefined
  private _sunLight: DirectionalLight | undefined
  private _sunAngle: number = -4
  private _sunDistance: number = 1
  private _sunLightBall: Mesh | undefined

  constructor(addTestLighting = true, addTestObjects = true) {
    super()
    if (addTestLighting) {
      this._sunLight = addPrettyLights(this.scene, this.bgColor).sunLight
    }

    if (addTestLighting) {
      const sunLightBall = makeBallAt(
        new Vector3(0.3, 0.2, 0),
        0.12,
        new Color(40, 40, 40)
      )
      this.scene.add(sunLightBall.ball)
      this._sunLightBall = sunLightBall.ball
    }

    if (addTestObjects) {
      const ringBase = new Object3D()

      const totalRandom = 20
      for (let i = 0; i < totalRandom; i++) {
        const pos = new Vector3(rand2(), rand2(), rand2())
        pos.normalize()
        if (pos.y < 0.4 && pos.y >= 0) {
          pos.y = 0.4
        } else if (pos.y > -0.4 && pos.y <= 0) {
          pos.y = -0.4
        }
        pos.normalize()
        pos.multiplyScalar(0.4)
        if (i % 3 === 0) {
          pos.multiplyScalar(1.4)
        }
        const ball = makeBallAt(pos, 0.01)
        ball.ball.scale.multiplyScalar(4)
        ringBase.add(ball.ball)
      }
      this.scene.add(ringBase)
      this.ringBase = ringBase
      const lightBall2 = makeBallAt(
        new Vector3(0, -0.2, 0),
        0.12,
        new Color(0.5, 1.2, 0.5)
      )
      lightBall2.ball.rotation.y = 0.01
      lightBall2.ball.scale.y *= 0.5
      this.scene.add(lightBall2.ball)

      const lightBall3 = makeBallAt(
        new Vector3(0, -0.36, 0),
        1,
        new Color(0.2, 0.3, 0.3)
      )
      lightBall3.ball.rotation.y = 0.01
      lightBall3.ball.scale.y *= 0.1
      this.scene.add(lightBall3.ball)

      const lightBall4 = makeBallAt(
        new Vector3(-0.3, -0.2, 0),
        0.12,
        new Color(0.5, 0.5, 1.2)
      )
      lightBall4.ball.rotation.y = 0.01
      lightBall4.ball.scale.y *= 0.5
      this.scene.add(lightBall4.ball)

      const lightBall5 = makeBallAt(
        new Vector3(0.3, -0.2, 0),
        0.12,
        new Color(1.2, 0.5, 0.5)
      )
      lightBall5.ball.rotation.y = 0.01
      lightBall5.ball.scale.y *= 0.5
      this.scene.add(lightBall5.ball)
    }
    const camDistance = new NiceFloatParameter(
      'test-camera-distance',
      'Cam Distance',
      1,
      0.5,
      5,
      distributions.quadratic,
      v => v.toFixed(2),
      'skyTest',
      RESET_USER_SETTINGS_TO_DEFAULTS,
      0.001,
      0,
      true
    )

    const camFov = new NiceFloatParameter(
      'test-camera-Fov',
      'Cam FOV',
      45,
      20,
      120,
      distributions.linear,
      v => v.toFixed(2),
      'skyTest',
      RESET_USER_SETTINGS_TO_DEFAULTS,
      0.001,
      0,
      true
    )

    const origin = new Vector3()
    const strength = 3
    let ratioX = 0.5
    let ratioY = 0.5
    let distance = camDistance.value
    const updateCameraPos = () => {
      const phi = (ratioX - 0.5) * strength * 2.0
      const theta = (ratioY - 0.5) * strength + Math.PI * 0.5

      const sinTheta = Math.sin(theta)
      this.camera.position.set(
        sinTheta * Math.sin(phi),
        Math.cos(theta),
        sinTheta * Math.cos(phi)
      )
      this.camera.position.multiplyScalar(
        lerp(distance * 0.25, distance, ratioX)
      )
      this.camera.lookAt(origin)
    }

    updateCameraPos()

    inputProvider.onDrag.addListener((x, y) => {
      if (Slider.anyInteracting) {
        return
      }
      if (x >= 0 && y >= 0) {
        ratioX = Math.max(0, x) / window.innerWidth
        ratioY = Math.max(0, y) / window.innerHeight
        updateCameraPos()
      }
    })

    camDistance.listen(v => {
      distance = v
      updateCameraPos()
    })

    camFov.listen(v => {
      if (this.camera instanceof PerspectiveCamera) {
        this.camera.fov = v
        this.camera.updateProjectionMatrix()
      }
    })
    registerDebugModalCategory('lightCacheTests', 'skyTest')
    registerDebugModalCategory('lightCacheTests', 'linework')
  }

  update(dt: number) {
    this._sunAngle += dt * 0.2
    if (this.ringBase) {
      this.ringBase.rotation.y += dt * 0.5
    }
    // this.ringBase.rotation.x += dt * 0.2
    if (this._sunLight) {
      this._sunLight.position.set(
        Math.cos(this._sunAngle) * this._sunDistance,
        0.2,
        Math.sin(this._sunAngle) * this._sunDistance
      )
      this._sunLight.lookAt(ZERO)
      // this.sunLight.updateMatrixWorld(true)
      if (this._sunLightBall) {
        this._sunLightBall.position.copy(this._sunLight.position)
        this._sunLightBall.position.multiplyScalar(0.8)
      }
    }
    super.update(dt)
  }
}
export const scene = TestLightCacheScene
