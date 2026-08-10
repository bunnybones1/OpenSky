import { Mesh, Object3D } from 'three'

import BasicMapMeshMaterial from '~/materials/BasicMapMeshMaterial'
import { findObject3DByName } from '~/utils/threeUtils'

import { AssetsManager } from '..'

export default function StarterDeckPostProcessor(
  assetsManager: AssetsManager,
  assetName: string,
  scene: Object3D
) {
  const deckFrameMesh = findObject3DByName<Mesh>(scene, 'deck-frame')
  const material = new BasicMapMeshMaterial()
  deckFrameMesh.material = material
  assetsManager.loadAsset('deckFramePalette').then(() => {
    material.texture = assetsManager.getAsset('deckFramePalette')
  })

  const deckBGMesh = findObject3DByName<Mesh>(scene, 'deck-cover-art')
  deckBGMesh.material = new BasicMapMeshMaterial()
}
