import { BufferGeometry, Color, Material, Mesh, Object3D } from 'three'

import FakeCylinderGlowMeshMaterial from '~/materials/FakeCylinderGlowMeshMaterial'

import { AssetsManager } from '../index'

export default function FakeCylinderGlowPostProcessor(
  assetsManager: AssetsManager,
  assetName: string,
  scene: Object3D
) {
  scene.traverse(node => {
    if (node instanceof Mesh && node.material instanceof Material) {
      node.material = new FakeCylinderGlowMeshMaterial({
        color: new Color(1.2, 0.1, 1.1)
      })
      const geo = node.geometry as BufferGeometry
      geo.setAttribute('position2', geo.morphAttributes.position[0])
    }
  })
  for (const child of scene.children) {
    child.position.set(0, 0, 0)
  }
}
