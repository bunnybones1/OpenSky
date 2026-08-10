import {
  Color,
  Mesh,
  MeshLambertMaterial,
  MeshStandardMaterial,
  Object3D
} from 'three'

import {
  COLOR_HOLOGRAPHIC_GLOW_SILVER,
  COLOR_WHITE
} from '~/colors/colorLibrary'
import { RENDER_ORDERS } from '~/constants'
import { applyBlendMode } from '~/helpers/blendModeHelpers'
import FresnelGlowMeshMaterial from '~/materials/FresnelGlowMeshMaterial'
import { testOverdraw } from '~/renderSettings'
import { experimentalGltfCleanup } from '~/utils/experimentalGltfCleanup'
import { convertAllOfOneTypeToOverdrawTests } from '~/utils/materials'
import { intensifyNormals, modify3DObjects } from '~/utils/threeUtils'

import { AssetsManager } from '../index'

export default function GameHolographicGlowPostProcessor(
  assetsManager: AssetsManager,
  assetName: string,
  scene: Object3D
) {
  experimentalGltfCleanup(scene)

  scene.traverse(obj => (obj.frustumCulled = false))

  for (const child of scene.children) {
    child.position.set(0, 0, 0)
  }

  modify3DObjects<Mesh>(scene, 'holographic-card-glow', obj => {
    intensifyNormals(obj, 2.5)
    const mat = obj.material as FresnelGlowMeshMaterial

    // mat.transparent = true
    applyBlendMode(mat, 'screen')
    obj.material = new FresnelGlowMeshMaterial({
      colorFrontFacing: COLOR_HOLOGRAPHIC_GLOW_SILVER
    })
    obj.renderOrder = RENDER_ORDERS.frame
    obj.position.y += 0.001
    obj.scale.multiplyScalar(1.2)
    obj.scale.x *= 1.3
    const darken = obj.clone()
    darken.name += '-darken'
    darken.material = new FresnelGlowMeshMaterial({
      colorFrontFacing: new Color('#072e4f'),
      colorSideFacing: COLOR_WHITE,
      blendMode: 'multiply'
    })
    darken.position.y += 0.002
    darken.renderOrder = RENDER_ORDERS.frame
    darken.scale.multiplyScalar(1.1)
    // darken.scale.x *= 1.3
    obj.parent?.add(darken)
  })

  if (testOverdraw.value) {
    convertAllOfOneTypeToOverdrawTests(scene, MeshLambertMaterial)
    convertAllOfOneTypeToOverdrawTests(scene, MeshStandardMaterial)
  }
}
