import { Object3D, Vector4 } from 'three'

import { makeWorldPointAt } from '~/helpers/makeWorldPointAt'
import QuadraticRibbonMesh from '~/meshes/QuadraticRibbonMesh'
import UpdateManager from '~/systems/UpdateManager'

import { BaseTestScene } from './BaseTestScene'

class TestQuadraticCurveMeshInHierarchyScene extends BaseTestScene {
  constructor() {
    super()
    const r = Math.random
    const parent = new Object3D()
    let time = 0
    const updater = {
      update(dt: number) {
        time += dt
        const t = time * 0.234
        const t2 = time * 1.124
        const t3 = time * 1.08239
        parent.position.set(Math.cos(t) * 0.2, -0.2, Math.sin(t) * 0.2 - 0.5)
        parent.rotation.set(t2, 0, t3)
        parent.scale.setScalar(Math.sin(t3 * 4) * 0.3 + 1.7)
      }
    }
    UpdateManager.register(updater)
    this.scene.add(parent)
    function wp(x: number, y: number, z: number) {
      return makeWorldPointAt(parent, x, y, z)
    }
    for (let i = 0; i < 10; i++) {
      const helperStart = wp(0.1, 0, 0)
      const helperHandle = wp(0, 0.1, 0)
      const helperEnd = wp(-0.1, 0, 0)
      const speed = r() * 0.4
      const speed2 = r() * 0.4
      const speed3 = r() * -0.4
      const offset = r() * 1000
      const offset2 = r() * 1000
      const offset3 = r() * 1000
      const height = r() * 0.1
      const updater = {
        update() {
          const t = time * speed + offset
          const t2 = time * speed2 + offset2
          const t3 = time * speed3 + offset3
          helperStart.position.set(Math.cos(t) * 0.2, height, Math.sin(t) * 0.2)
          helperHandle.position.set(
            Math.cos(t2) * 0.1,
            height + 0.1,
            Math.sin(t2) * 0.1
          )
          helperEnd.position.set(Math.cos(t3) * 0.2, height, Math.sin(t3) * 0.2)
        }
      }
      UpdateManager.register(updater)
      const c = new QuadraticRibbonMesh({
        matOptions: {
          positionStart: helperStart.worldPosition,
          positionHandle: helperHandle.worldPosition,
          positionEnd: helperEnd.worldPosition,
          relativeWidth: 0.02,
          color: new Vector4(r(), r(), r(), 1).multiplyScalar(2),
          color2: new Vector4(r(), r(), r(), 1).multiplyScalar(2),
          blendMode: 'screenAlpha'
        },
        geomOptionsKey: 'attributionLine'
      })
      this.scene.add(c)
    }
  }
}
export const scene = TestQuadraticCurveMeshInHierarchyScene
;(TestQuadraticCurveMeshInHierarchyScene as any).v = 11
