import { BufferGeometry, Mesh, Object3D } from 'three'

import { getAssetsManager } from '~/assets'
import BasicVertexColorMeshMaterial from '~/materials/BasicVertexColorMeshMaterial'

export async function attachMagicCube(base: Object3D) {
  const assetMan = getAssetsManager()
  await assetMan.loadAsset('tutorialCube')
  const cube = assetMan.fetchMeshDeepClone(
    'tutorialCube',
    'tutorial-cube',
    true,
    true
  ) as Mesh<BufferGeometry, BasicVertexColorMeshMaterial>
  cube.renderOrder = 10000
  base.add(cube)
  return cube
}
