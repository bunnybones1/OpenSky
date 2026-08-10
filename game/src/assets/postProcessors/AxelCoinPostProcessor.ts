import { Color, Material, Mesh, Object3D } from 'three'

import FresnelGlowMeshMaterial from '~/materials/FresnelGlowMeshMaterial'
import { removeFromParent } from '~/utils/threeUtils'

import { AssetsManager } from '../index'

export default function AxelCoinPostProcessor(
  assetsManager: AssetsManager,
  assetName: string,
  scene: Object3D
) {
  const thingsToRemove: Object3D[] = []
  scene.traverse(node => {
    if (node instanceof Mesh && node.material instanceof Material) {
      if (node.name === 'glow') {
        node.material = new FresnelGlowMeshMaterial(
          {
            colorFrontFacing: new Color(1, 0.05, 0.9),
            finalColorScale: new Color(3, 3, 3)
          },
          { transparent: true }
        )
        thingsToRemove.push(node)
      }
    }
  })
  for (const child of scene.children) {
    child.position.set(0, 0, 0)
  }
  for (const node of thingsToRemove) {
    removeFromParent(node)
  }
}
