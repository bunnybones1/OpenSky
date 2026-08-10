import { Vector3, Vector4 } from 'three'

import QuadraticRibbonMesh from '~/meshes/QuadraticRibbonMesh'
import UpdateManager from '~/systems/UpdateManager'

import { BaseTestScene } from './BaseTestScene'

class TestQuadraticCurveMeshScene extends BaseTestScene {
  constructor() {
    super()
    const r = Math.random
    const speedGlobal = 0.01
    for (let i = 0; i < 10; i++) {
      const positionStart = new Vector3(0.1, 0, 0)
      const positionHandle = new Vector3(0, 0.1, 0)
      const positionEnd = new Vector3(-0.1, 0, 0)
      const speed = r() * 0.4 * speedGlobal
      const speed2 = r() * 0.4 * speedGlobal
      const speed3 = r() * -0.4 * speedGlobal
      const offset = r() * 1000
      const offset2 = r() * 1000
      const offset3 = r() * 1000
      const height = r() * 0.1
      let time = 0
      const updater = {
        update(dt: number) {
          time += dt
          const t = time * speed + offset
          const t2 = time * speed2 + offset2
          const t3 = time * speed3 + offset3
          positionStart.set(Math.cos(t) * 0.2, height, Math.sin(t) * 0.2)
          positionHandle.set(
            Math.cos(t2) * 0.1,
            height + 0.1,
            Math.sin(t2) * 0.1
          )
          positionEnd.set(Math.cos(t3) * 0.2, height, Math.sin(t3) * 0.2)
        }
      }
      UpdateManager.register(updater)
      const c = new QuadraticRibbonMesh({
        matOptions: {
          positionStart,
          positionHandle,
          positionEnd,
          relativeWidth: 0.02,
          color: new Vector4(r(), r(), r(), 1),
          color2: new Vector4(r(), r(), r(), 1),
          blendMode: 'screenAlpha',
          depthWrite: false
        },
        geomOptionsKey: 'attributionLine'
      })
      this.scene.add(c)
    }
  }
}
export const scene = TestQuadraticCurveMeshScene
