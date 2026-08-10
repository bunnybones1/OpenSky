import { Vector3 } from 'three'

import { getMissileLauncher } from '~/meshes/Particles/particleLauncherFactory'
import { updateParticleGeometries } from '~/meshes/Particles/particleLayerFactory'
import NiceMethod from '~/utils/NiceMethod'

import { TestLightCacheSkyScene } from './TestLightCacheSkyScene'

type Task = () => Promise<any>
class TestGatlingDurationScene extends TestLightCacheSkyScene {
  constructor() {
    super()

    const queue: Task[] = []
    let currentTask: Task | undefined
    async function attemptToProcessTasks() {
      if (currentTask === undefined && queue.length > 0) {
        currentTask = queue.shift()!
        await currentTask()
        currentTask = undefined
        attemptToProcessTasks()
      }
    }
    function addToQueue(task: Task) {
      queue.push(task)
      attemptToProcessTasks()
    }
    new NiceMethod(
      '',
      () => {
        addToQueue(() =>
          getMissileLauncher('fireMissile', this.scene).launch(
            new Vector3(-0.1, 0.1, 0.1),
            new Vector3(-0.1, 0.1, -0.1)
          )
        )
      },
      'queue fire missile',
      'linework',
      0
    )
    new NiceMethod(
      '',
      () => {
        addToQueue(() =>
          getMissileLauncher('magicMissile', this.scene).launch(
            new Vector3(0.1, 0.1, 0.1),
            new Vector3(0.1, 0.1, -0.1)
          )
        )
      },
      'queue magic missile',
      'linework',
      0
    )
  }
  update(dt: number) {
    updateParticleGeometries(dt)
    super.update(dt)
  }
}

export const scene = TestGatlingDurationScene
