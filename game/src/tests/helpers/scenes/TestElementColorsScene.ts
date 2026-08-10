import { GammaEncoding, Mesh, PerspectiveCamera, Texture } from 'three'

import { getAssetsManager } from '~/assets'
import { elementColors, elementsArr } from '~/constants'
import BasicMapMeshMaterial from '~/materials/BasicMapMeshMaterial'
import CardArtMeshMaterial from '~/materials/CardArtMeshMaterial'
import { getSharedPlaneBufferGeometry } from '~/utils/geometry'

import { BaseTestScene } from './BaseTestScene'

class TestElementColorsScene extends BaseTestScene {
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
      let i = 0
      const columns = 4
      const map = (await getAssetsManager().load(
        'texture',
        'game/effects/opaque/elements-color-reference.png'
      )) as Texture
      map.encoding = GammaEncoding
      const testPlane = new Mesh(
        getSharedPlaneBufferGeometry(),
        new BasicMapMeshMaterial({ map })
      )
      testPlane.scale.set(2, 1, 1).multiplyScalar(1000)
      scene.add(testPlane)
      const order = [4, 5, 6, 0, 2, 7, 1, 3]
      for (const element of elementsArr) {
        const i2 = order.indexOf(i)
        if (i2 !== -1) {
          const tester = getAssetsManager().fetchMeshDeepClone(
            'gamePiecesGraphical',
            'element-color-tester',
            true,
            true
          )
          if (
            tester instanceof Mesh &&
            tester.material instanceof CardArtMeshMaterial
          ) {
            tester.material.decalColor = elementColors[element]
            scene.add(tester)
          }
          const col = i2 % columns
          const row = ~~(i2 / columns)
          tester.position.set(
            (col - columns * 0.5) * 100,
            (row - columns * 0.5) * 100,
            500
          )
          tester.scale.multiplyScalar(2000)
        }
        i++
      }
    }
    init()
  }
}
export const scene = TestElementColorsScene
