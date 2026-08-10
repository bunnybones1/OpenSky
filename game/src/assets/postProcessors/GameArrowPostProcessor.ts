import {
  Mesh,
  MeshLambertMaterial,
  MeshStandardMaterial,
  Object3D,
  Vector2
} from 'three'

import { COLOR_ARROW_YELLOW, COLOR_BLACK } from '~/colors/colorLibrary'
import materialLibrary from '~/materials/library'
import { testOverdraw } from '~/renderSettings'
import { experimentalGltfCleanup } from '~/utils/experimentalGltfCleanup'
import { convertAllOfOneTypeToOverdrawTests } from '~/utils/materials'
import { findObject3DByName } from '~/utils/threeUtils'

import { AssetsManager } from '../index'

export default function GameArrowPostProcessor(
  assetsManager: AssetsManager,
  assetName: string,
  scene: Object3D
) {
  experimentalGltfCleanup(scene)

  scene.traverse(obj => (obj.frustumCulled = false))

  for (const child of scene.children) {
    child.position.set(0, 0, 0)
  }

  const arrowMat = materialLibrary.getMagicFire(assetsManager).variant({
    useLengthRatio: true,
    color: COLOR_BLACK,
    color2: COLOR_ARROW_YELLOW,
    scrollTiling: new Vector2(-11, -4)
  })

  const intentArrowMeshProtoype = findObject3DByName<Mesh>(
    scene,
    'intent-arrow'
  )
  intentArrowMeshProtoype.material = arrowMat

  if (testOverdraw.value) {
    convertAllOfOneTypeToOverdrawTests(scene, MeshLambertMaterial)
    convertAllOfOneTypeToOverdrawTests(scene, MeshStandardMaterial)
  }
}
