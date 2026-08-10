import {
  GammaEncoding,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Texture
} from 'three'

import { getAssetsManager } from '~/assets'
import { getSharedPlaneBufferGeometry } from '~/utils/geometry'

import { BaseTestScene } from './BaseTestScene'

class TestMipMapsScene extends BaseTestScene {
  constructor() {
    super()

    const camera = this.camera as PerspectiveCamera

    camera.fov = 60
    camera.near = 0.01
    camera.far = 2000
    camera.updateProjectionMatrix()

    camera.position.set(0, 0, 1200)
    camera.lookAt(0, 0, 0)

    const init = async () => {
      await getAssetsManager().loadAsset('gamePiecesGraphical')
      const scene = this.scene
      const map = (await getAssetsManager().load(
        'texture',
        'game/cards/art-full/heroes/hero-xavi-01.png'
        // 'game/effects/transparent/hero-test-texture.png'
      )) as Texture
      map.encoding = GammaEncoding
      const testPlane = new Mesh(
        getSharedPlaneBufferGeometry(),
        new MeshBasicMaterial({ map, transparent: true, fog: false })
      )
      testPlane.scale.set(0.6, 1, 1).multiplyScalar(100)
      scene.add(testPlane)
    }
    init()
  }
}
export const scene = TestMipMapsScene
