import { Color, DoubleSide, Material, Mesh } from 'three'

import { getAssetsManager } from '~/assets/index'
import LightCacheMeshMaterial from '~/lightCaches/materials/LightCacheMeshMaterial'
import FresnelGlowMeshMaterial from '~/materials/FresnelGlowMeshMaterial'
import InteractiveObject3D from '~/meshes/InteractiveObject3D'
import { Easing } from '~/systems/animation/Easing'
import UpdateManager from '~/systems/UpdateManager'
import { Interactives } from '~/utils/helpers/InteractivesHelpers'
import { registerMeshesToLCMaterials } from '~/utils/materials'
import { findObject3DByName, modify3DObjects } from '~/utils/threeUtils'

let __offset = 0
export function createHolographicCardBackInteractives(): Interactives {
  const visualsRoot = new InteractiveObject3D(
    getAssetsManager().fetchMeshDeepClone(
      'gamePiecesPhysical',
      'holographic-card',
      true,
      true
    )
  )

  const visualGlow = getAssetsManager().fetchMeshDeepClone(
    'gameHolographicGlow',
    'holographic-card-glow',
    true,
    false
  )
  const visualGlowDarken = getAssetsManager().fetchMeshDeepClone(
    'gameHolographicGlow',
    'holographic-card-glow-darken',
    true,
    false
  )
  visualsRoot.add(visualGlowDarken)
  visualsRoot.add(visualGlow)

  const colorScale = new Color(1, 1, 1)
  let now = 0
  const offset = (__offset += 0.1)
  UpdateManager.register({
    update(dt: number) {
      now += dt
      const s = Easing.Custom.GlitchyPulseLoop((now * 0.3 + offset) % 1)
      colorScale.setRGB(s, s, s)
    }
  })

  modify3DObjects<Mesh>(
    visualsRoot,
    'holographic-card-frame',
    obj => {
      if (obj.material instanceof LightCacheMeshMaterial) {
        obj.material.uniforms.uFinalColorScale.value = colorScale
      }
      obj.renderOrder = 100
    },
    true
  )

  modify3DObjects<Mesh>(
    visualsRoot,
    'holographic-card-glow',
    obj => {
      if (obj.material instanceof Material) {
        obj.material = obj.material.clone()
        if (obj.material instanceof FresnelGlowMeshMaterial) {
          obj.material.finalColorScale = colorScale
        }
      }
      obj.renderOrder = 100
    },
    true
  )

  const s = 0.95
  visualsRoot.scale.set(s, s, s)
  registerMeshesToLCMaterials(visualsRoot)

  const collider = findObject3DByName<Mesh>(
    visualsRoot,
    'holographic-card-collider'
  )
  visualsRoot.collider = collider

  const colliderMaterial = collider.material as Material
  colliderMaterial.side = DoubleSide

  visualsRoot.traverse(obj => {
    if (obj.userData.isFrontFacing) {
      obj.visible = false
    }
  })

  return { visualsRoot, collider }
}
