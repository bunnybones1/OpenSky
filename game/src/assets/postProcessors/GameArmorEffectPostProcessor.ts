import {
  Mesh,
  MeshLambertMaterial,
  MeshStandardMaterial,
  Object3D
} from 'three'

import MagicEnergyWaveMeshMaterial from '~/materials/MagicEnergyWaveMeshMaterial'
import { testOverdraw } from '~/renderSettings'
import { experimentalGltfCleanup } from '~/utils/experimentalGltfCleanup'
import { convertAllOfOneTypeToOverdrawTests } from '~/utils/materials'
import { findObject3DByName } from '~/utils/threeUtils'

import { AssetsManager } from '../index'

export default function GameArmorEffectPostProcessor(
  assetsManager: AssetsManager,
  assetName: string,
  scene: Object3D
) {
  experimentalGltfCleanup(scene)

  scene.traverse(obj => (obj.frustumCulled = false))

  for (const child of scene.children) {
    child.position.set(0, 0, 0)
  }

  const armorBubble = findObject3DByName<Mesh>(scene, 'armor-bubble')
  if (armorBubble) {
    armorBubble.material = new MagicEnergyWaveMeshMaterial(assetsManager)
  }

  if (testOverdraw.value) {
    convertAllOfOneTypeToOverdrawTests(scene, MeshLambertMaterial)
    convertAllOfOneTypeToOverdrawTests(scene, MeshStandardMaterial)
  }
}
