import { getUrlFlag } from '@opensky/shared/utils/location'
import { Color, Object3D, Scene, Vector3, WebGLRenderer } from 'three'

import inputProvider from '~/systems/input/input'
import { cameraHomePositionBlend } from '~/tempDesignOptions'
import { makeBallAt } from '~/tests/helpers/utils/lightCacheTestBallMakers'
import { cameraShaker } from '~/utils/cameraShaker'

const camera = cameraShaker.camera
cameraHomePositionBlend.listen(v => (cameraShaker.positionHomeBlend = v))

export const scene = new Scene()

scene.autoUpdate = false
scene.matrixAutoUpdate = false

const shakyCamera = cameraShaker.shakyCamera
export const lights: Object3D[] = []

const arena = new Object3D()

export const initScene = () => {
  document.body.style.backgroundColor = '#101010'

  const sunLightBall = makeBallAt(
    new Vector3(-0.435, 0.57, -0.6),
    0.12,
    new Color(105 * 1.33, 125 * 1.33, 145 * 1.33)
  )
  sunLightBall.ball.updateMatrixWorld(true)

  scene.add(sunLightBall.ball)

  if (getUrlFlag('moveLight')) {
    setInterval(() => {
      sunLightBall.ball.position.set(
        inputProvider.positionClipspace.x,
        inputProvider.positionClipspace.y,
        -0.6
      )
      console.log(sunLightBall.ball.position)
    }, 100)
  }

  scene.add(camera)
  camera.updateMatrix()
  camera.updateMatrixWorld(true)
  cameraShaker.minAspect = 0.2 //to trick aspectRatio into not protecting portrait mode for card capture
  cameraShaker.fov = 35
  cameraHomePositionBlend.value = 1

  arena.scale.multiplyScalar(0.07)
  arena.position.z -= 0.05
  scene.add(arena)
  arena.updateMatrixWorld(true)
}

export function renderScene(renderer: WebGLRenderer) {
  renderer.setClearColor(0x000000, 0)

  renderer.clearColor()
  renderer.clearDepth()
  renderer.render(scene, shakyCamera)
  renderer.setClearAlpha(0)
}
