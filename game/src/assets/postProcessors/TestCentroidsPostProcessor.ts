import { Mesh, Object3D } from 'three'

import { RENDER_ORDERS } from '~/constants'
import { TestCentroidsMeshMaterial } from '~/materials/TestCentroidsMeshMaterial'
import { experimentalGltfCleanup } from '~/utils/experimentalGltfCleanup'

import { AssetsManager } from '../index'

export default function TestCentroidsPostProcessor(
  assetsManager: AssetsManager,
  assetName: string,
  scene: Object3D
) {
  experimentalGltfCleanup(scene)
  scene.traverse(obj => {
    obj.frustumCulled = false
    obj.renderOrder = RENDER_ORDERS.cardArt
  })

  for (const mesh of scene.children) {
    if (mesh instanceof Mesh) {
      // mesh origins need to be reset
      mesh.position.set(0, 0, 0)
      if (mesh.name.includes('centroids')) {
        mesh.material = new TestCentroidsMeshMaterial({})
      }
    }
  }
}
