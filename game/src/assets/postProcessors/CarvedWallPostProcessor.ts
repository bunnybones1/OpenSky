import { BufferGeometry, Color, Mesh, Object3D, Vector2 } from 'three'

import { RENDER_ORDERS } from '~/constants'
import LightCacheMeshMaterial from '~/lightCaches/materials/LightCacheMeshMaterial'
import { experimentalGltfCleanup } from '~/utils/experimentalGltfCleanup'

import { AssetsManager } from '../index'

export default function CarvedWallPostProcessor(
  assetsManager: AssetsManager,
  assetName: string,
  scene: Object3D
) {
  experimentalGltfCleanup(scene)
  scene.traverse(obj => {
    obj.frustumCulled = false
    obj.renderOrder = RENDER_ORDERS.cardArt
  })

  for (const mesh of scene.children) {
    if (mesh instanceof Mesh) {
      // mesh origins need to be reset
      mesh.position.set(0, 0, 0)
      if (mesh.geometry instanceof BufferGeometry) {
        const mat = new LightCacheMeshMaterial(assetsManager, {
          // transmissionAmount: 1.0,
          // transmissionRoughness: 4,
          // refractionZoom: 0.4,
          // transmissionColor: new Color(0.2, 0.3, 1.0),

          // transmission: 1.0,
          useMetallicDiffuse: true,
          useCentroids: true,
          centroidSettings: 'wall',
          centroidTestSpeed: 2,
          // ...lightCacheMaterialParamsLibrary.testLump,
          // reflectionSpecularityVertexAttribute: 'color.a',
          // diffusionVertexAttribute: 'color.rgb',
          // emissionVertexAttribute: 'color_1.rgb',
          // blackoutVertexAttribute: 'color_1.a',
          // blackoutBeforeEmissive: true
          // diffusionColor: new Color(0.3, 0.3, 0.3),
          diffusionColor: new Color(0.15, 0.1, 0.3),
          // color: 'color.rgb',
          emission: new Color(0, 0, 0),
          // emission: 'color_1.rgb',
          reflectionRoughness: 2,
          diffusionRoughness: 3,
          // reflectionColor: new Color(1, 1, 1),
          reflectionColor: new Color(0.15 * 2, 0.1 * 2, 0.3 * 2),
          reflectionStrengthPerpendicularVSHeadOn: new Vector2(0, 1)
          // wornEdges: 'uv.xy'
        })
        mesh.material = mat
      }
    }
  }
}
