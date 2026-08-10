import { Mesh, MeshLambertMaterial, Object3D } from 'three'

import { lightCacheMaterialParamsLibrary } from '~/lightCaches/materials/lightCacheMatLib'
import LightCacheMeshMaterial from '~/lightCaches/materials/LightCacheMeshMaterial'
import { testOverdraw } from '~/renderSettings'
import { convertAllOfOneTypeToOverdrawTests } from '~/utils/materials'
import { findObject3DByName } from '~/utils/threeUtils'

import { AssetsManager } from '../index'
export default function TestLumpPostProcessor(
  assetsManager: AssetsManager,
  assetName: string,
  arena: Object3D
) {
  const island = findObject3DByName<Mesh>(arena, 'lump')
  const mat = new LightCacheMeshMaterial(assetsManager, {
    ...lightCacheMaterialParamsLibrary.island,
    // reflectionSpecularityVertexAttribute: 'color.a',
    diffusionColor: 'color.rgb',
    emission: 'color_1.rgb',
    transmissionAmount: 'color.a',
    diffusionRoughness: 'color_1.a',
    reflectionRoughness: 'uv2.y',
    wornEdges: 'uv.xy'
    // specLevel: 'uv2.y'
    // blackoutVertexAttribute: 'color_1.a',
    // blackoutBeforeEmissive: true
  })
  island.traverse(obj => {
    if (obj instanceof Mesh) {
      obj.material = mat
    }
  })
  if (testOverdraw.value) {
    convertAllOfOneTypeToOverdrawTests(arena, MeshLambertMaterial)
  }
}
