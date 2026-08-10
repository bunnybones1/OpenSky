import { Mesh, Scene } from 'three'

import { getAssetsManager } from '~/assets/index'
import CardArtMeshMaterial from '~/materials/CardArtMeshMaterial'

export function initMaterialShaderVariantCacheHack(scene: Scene) {
  function makeCardArtVariantBase() {
    const tempMesh = getAssetsManager().fetchMeshDeepClone(
      'gamePiecesGraphical',
      'card-hero-art',
      true
    ) as Mesh
    tempMesh.position.y = 99
    tempMesh.scale.setScalar(0.2)
    scene.add(tempMesh)
    tempMesh.onAfterRender = function hideIt() {
      this.visible = false
    }
    return tempMesh.material as CardArtMeshMaterial
  }
  makeCardArtVariantBase().colorMatrixStackWhole.castStart.animator.value = true
  makeCardArtVariantBase().colorMatrixStackFg.frozen.animator.value = true
  const comboColorVariant = makeCardArtVariantBase()
  comboColorVariant.colorMatrixStackWhole.castStart.animator.value = true
  comboColorVariant.colorMatrixStackFg.frozen.animator.value = true
}
