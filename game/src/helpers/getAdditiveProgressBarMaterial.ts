import { AdditiveBlending, Color, LessEqualDepth } from 'three'

import BasicColorProgressBarMeshMaterial from '~/materials/BasicColorProgressBarMeshMaterial'

export function getAdditiveProgressBarMaterial(color: Color) {
  return new BasicColorProgressBarMeshMaterial({
    color,
    blending: AdditiveBlending,
    transparent: true,
    depthWrite: false,
    // depthFunc: NeverDepth
    // depthFunc: AlwaysDepth
    // depthFunc: LessDepth
    depthFunc: LessEqualDepth
    // depthFunc: EqualDepth
    // depthFunc: GreaterEqualDepth
    // depthFunc: GreaterDepth
    // depthFunc: NotEqualDepth,
  })
}
