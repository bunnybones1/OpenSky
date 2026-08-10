import renderController from '@opensky/shared/renderController'
import { Camera, Scene } from 'three'

import { time } from './animationTime'
import { debuggables } from './debug/debugRegistry'
import { abort } from './helpers/abortError'
import { isReplayGame } from './helpers/envGameModeHelpers'
import worldPositionCacheManager from './helpers/worldPositionCacheManager'
import { updateParticleGeometries } from './meshes/Particles/particleLayerFactory'
import queryParams from './queryParams'
import renderer, {
  clearRenderer,
  onNextRenderCallbacks,
  renderSceneGameAll
} from './renderer'
import { UI } from './scenes/ui'
import { statePlayer } from './state/StatePlayer'
import { simpleTweener } from './systems/animation/tweeners'
import { underPointer } from './systems/input/input'
import UpdateManager from './systems/UpdateManager'
import { time2UniformFactory } from './time2Uniforms'
import { timeUniformFactory } from './timeUniforms'
import { timeWaveUniformFactory } from './timeWaveUniforms'
import {
  automaticMatrices,
  toggleCustomMatrixUpdateHandling
} from './userSettings'
import { cameraShaker } from './utils/cameraShaker'
import { updateCursor } from './utils/cursorUtils'
import { masterFrameRateTracker } from './utils/frameRateTracker'
import { NOOP } from './utils/jsUtils'
import { nextFrameUpdate } from './utils/onNextFrame'
import { taskTimer } from './utils/taskTimer'
import { getMatrixReport, resetMatrixReport } from './utils/threeOverrides'
import { getPrerenderKit } from './utils/threeUtils'
import { timeWarp } from './utils/timeWarp'
import { listenForVisibilityChange } from './utils/visibility'
// import { TrackableCollection } from './utils/TrackableCollection'
import { world } from './world'

let __started = false
let __tabbedAway = false

type SceneChanger = {
  change: (s: Scene) => void
}

export const sceneChanger: SceneChanger = {
  change: NOOP
}

type CameraChanger = {
  change: (c: Camera) => void
}

export const cameraChanger: CameraChanger = {
  change: NOOP
}

type UpdateChanger = {
  change: (u: (dt: number) => void) => void
}

export const updateChanger: UpdateChanger = {
  change: NOOP
}

export function startMainGameLoop(
  ui: UI,
  camera: Camera,
  scene: Scene,
  update: (dt: number) => void
) {
  if (__started) {
    return
  }
  __started = true
  // TrackableCollection.paused = true

  sceneChanger.change = s => (scene = s)
  cameraChanger.change = c => (camera = c)
  updateChanger.change = u => (update = u)

  function loopSafe() {
    try {
      loopRaw()
    } catch (err) {
      abort(err)
    }
  }

  function loopRaw() {
    if (!renderController.active) {
      requestAnimationFrame(loop)
      return
    }
    if (toggleCustomMatrixUpdateHandling.value) {
      resetMatrixReport()
    }
    const overrideDtMax = __tabbedAway ? 0.0 : undefined
    if (__tabbedAway) {
      __tabbedAway = false
    }
    if (!masterFrameRateTracker.updateShouldRender(overrideDtMax)) {
      requestAnimationFrame(loop)
      return
    }
    nextFrameUpdate()
    renderer.info.reset()
    getPrerenderKit().render(renderer)

    let dt = masterFrameRateTracker.currentDeltaTime
    timeWarp.update(dt)
    dt *= timeWarp.speed
    time.value += dt
    simpleTweener.update(dt * 1000)
    UpdateManager.update(dt)
    taskTimer.update(dt)
    cameraShaker.update(dt)
    timeUniformFactory.update(dt)
    time2UniformFactory.update(dt)
    timeWaveUniformFactory.update(dt)
    underPointer.update()

    world.update(dt, time.value)
    // TrackableCollection.nudge()
    worldPositionCacheManager.update()

    update(dt)

    updateParticleGeometries(dt)

    if (automaticMatrices.value || debuggables.activeState) {
      scene.updateMatrixWorld(false)
    }
    // Render Arena
    clearRenderer()
    renderSceneGameAll(scene, camera)

    ui.update(dt)

    if (isReplayGame) {
      statePlayer.update(dt)
    }
    if (toggleCustomMatrixUpdateHandling.value) {
      console.log(getMatrixReport())
    }

    for (const cb of onNextRenderCallbacks) {
      cb()
    }
    onNextRenderCallbacks.length = 0

    updateCursor()

    requestAnimationFrame(loop)
  }

  const loop: () => void = queryParams.noCatch ? loopRaw : loopSafe
  requestAnimationFrame(loop)
}

listenForVisibilityChange(hidden => {
  if (hidden) {
    __tabbedAway = true
  }
})
