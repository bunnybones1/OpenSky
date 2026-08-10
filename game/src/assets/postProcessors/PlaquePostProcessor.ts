import { BufferGeometry, Color, Mesh, Object3D, Vector2 } from 'three'

import { RENDER_ORDERS } from '~/constants'
import LightCacheMeshMaterial from '~/lightCaches/materials/LightCacheMeshMaterial'
import { experimentalGltfCleanup } from '~/utils/experimentalGltfCleanup'

import { AssetsManager } from '../index'

export default function PlaquePostProcessor(
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
          // transmissionRoughness: 0.6,
          // refractionZoom: 0.5,
          // transmissionColor: new Color(1, 0.2, 0.2),
          useMetallicDiffuse: true,
          useCentroids: true,
          centroidSettings: mesh.name.includes('defeat')
            ? 'plaque_broken'
            : 'plaque',

          // ...lightCacheMaterialParamsLibrary.testLump,
          // reflectionSpecularityVertexAttribute: 'color.a',
          // diffusionVertexAttribute: 'color.rgb',
          // emissionVertexAttribute: 'color_1.rgb',
          // blackoutVertexAttribute: 'color_1.a',
          // blackoutBeforeEmissive: true
          // color: new Color(0.4, 0.4, 0.4),
          diffusionColor: 'color.rgb',
          // diffusionColor: new Color(0.7, 0.7, 0.7),
          emission: new Color(0, 0, 0),
          // emission: 'color_1.rgb',
          reflectionRoughness: 'color_1.r',
          diffusionRoughness: 'color_1.g',
          reflectionColor: 'color.aaa',
          reflectionStrengthPerpendicularVSHeadOn: new Vector2(1, 0)
          // wornEdges: 'uv.xy'
        })
        mesh.material = mat
      }
    }
  }
}
