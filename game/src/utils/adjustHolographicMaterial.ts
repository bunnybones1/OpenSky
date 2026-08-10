import { Rarity } from '@skyweaver/state-metadata'
import { Color, Mesh, MeshBasicMaterial, Object3D } from 'three'

import {
  COLOR_HOLOGRAPHIC_GLOW_GOLD,
  COLOR_HOLOGRAPHIC_GLOW_SILVER
} from '~/colors/colorLibrary'
import FresnelGlowMeshMaterial from '~/materials/FresnelGlowMeshMaterial'

import { findObject3DByName } from './threeUtils'

export function adjustHolographicMaterial(
  visualsRoot: Object3D,
  rarity: Rarity
) {
  const t = findObject3DByName(visualsRoot, 'holographic-card-frame', true)
  const glowColor = new Color()
  if (rarity === 'silver') {
    glowColor.copy(COLOR_HOLOGRAPHIC_GLOW_SILVER)
  } else if (rarity === 'gold') {
    glowColor.copy(COLOR_HOLOGRAPHIC_GLOW_GOLD)
  }
  if (t instanceof Mesh && t.material instanceof MeshBasicMaterial) {
    t.material = t.material.clone()
    t.material.color.copy(glowColor)
  }
  visualsRoot.traverse(m => {
    if (m instanceof Mesh) {
      if (m.material instanceof FresnelGlowMeshMaterial) {
        m.material.colorFrontFacing = glowColor
      }
    }
  })
}
