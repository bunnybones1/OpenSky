import { Object3D, PerspectiveCamera } from 'three'

import { getAssetsManager } from '~/assets'
import {
  ARENA_ANGLE,
  ARENA_CAMERA_DISTANCE,
  ARENA_OFFSET_Y,
  RENDER_ORDERS
} from '~/constants'
import renderer from '~/renderer'
import { initClouds, initIsland } from '~/scenes/arena/helpers'
import Sky from '~/scenes/arena/Sky'

import { TestLightCacheScene } from './TestLightCacheScene'

export class TestLightCacheSkyScene extends TestLightCacheScene {
  sky: Sky
  constructor() {
    super(false, false)
    const camera = this.camera as PerspectiveCamera
    const angle = ARENA_ANGLE
    camera.position.set(
      0,
      Math.cos(angle) * ARENA_CAMERA_DISTANCE + ARENA_OFFSET_Y,
      Math.sin(angle) * ARENA_CAMERA_DISTANCE
    )
    camera.lookAt(0, ARENA_OFFSET_Y, 0)
    camera.updateProjectionMatrix()

    const initSky = async () => {
      await getAssetsManager().loadAsset('dayNightColorStrip')
      const skyNode = new Object3D()
      this.scene.add(skyNode)
      const skyRadius = 16
      const sky = new Sky(
        renderer,
        this.scene,
        skyNode,
        getAssetsManager().getAsset('dayNightColorStrip'),
        skyRadius,
        1.5,
        15,
        48,
        false,
        false
      )

      if (this.camera instanceof PerspectiveCamera) {
        this.camera.far *= 60
        this.camera.updateProjectionMatrix()
      }
      skyNode.traverse(o => (o.renderOrder = RENDER_ORDERS.sky))
      sky.skyDome.renderOrder = RENDER_ORDERS.sky + 1

      await getAssetsManager().loadAsset('gameBoardBasicModel')
      const arena = new Object3D()
      arena.scale.multiplyScalar(0.07)
      arena.position.z -= 0.05
      this.scene.add(arena)
      arena.updateMatrixWorld(true)
      initIsland(arena, getAssetsManager().getAsset('gameBoardBasicModel'))
      await initClouds(arena, sky)
      this.sky = sky
    }
    initSky()
  }
  update(dt: number) {
    if (this.sky) {
      this.sky.update(dt)
    }
    super.update(dt)
  }
}

export const scene = TestLightCacheSkyScene
