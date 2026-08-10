import {
  Camera,
  FrontSide,
  Material,
  Mesh,
  MeshBasicMaterial,
  Object3D
} from 'three'

import BasicMapMeshMaterial from '~/materials/BasicMapMeshMaterial'

import { AssetsManager } from '../index'

export default function CardBackPostProcessor(
  assetsManager: AssetsManager,
  assetName: string,
  scene: Object3D
) {
  let cam: Camera | undefined

  scene.traverse(node => {
    if (node instanceof Camera) {
      cam = node
    }
  })
  scene.traverse(node => {
    if (node instanceof Mesh && node.material instanceof Material) {
      if (
        cam &&
        node.name === 'card-back' &&
        node.material instanceof MeshBasicMaterial
      ) {
        const camPos = cam.position.clone()
        node.material = new BasicMapMeshMaterial(
          { map: node.material.map!, perspectivePoint: camPos },
          { alphaTest: 0.5 }
        )
      }
      node.material.side = FrontSide
    }
  })
  for (const child of scene.children) {
    child.position.set(0, 0, 0)
  }
}
