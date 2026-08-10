import { AssetName } from '@opensky/shared/assets'
import { Mesh, Object3D } from 'three'

import { AssetsManager } from '../index'

export default function MeshAnimationPostProcessor(
  assetsManager: AssetsManager,
  assetName: AssetName,
  scene: Object3D
) {
  for (const mesh of scene.children) {
    if (mesh instanceof Mesh) {
      // mesh origins need to be reset
      mesh.position.set(0, 0, 0)
    }
  }
}
