import { Mesh } from 'three'

import { getAssetsManager } from '~/assets'
import { scene } from '~/scenes/arena/scene'
import BasicIslandTest from '~/tests/BasicIslandTest'
import { modifyMeshForCentroidAnimations } from '~/utils/experimentalGltfCleanup'

async function testBasicCentroidsMeshEffectsScene() {
  const islandTest = new BasicIslandTest()
  await islandTest.init()

  await getAssetsManager().loadAsset('testCentroids')
  const mesh = getAssetsManager().fetchMeshDeepClone(
    'testCentroids',
    'test-centroids',
    undefined,
    true
  ) as Mesh

  modifyMeshForCentroidAnimations(mesh)
  mesh.position.y = 0.05
  mesh.scale.multiplyScalar(0.4)

  scene.add(mesh)
}

export const test = testBasicCentroidsMeshEffectsScene
