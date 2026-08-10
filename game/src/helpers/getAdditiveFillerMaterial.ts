import { AdditiveBlending, Color, LessEqualDepth } from 'three'

import BasicColorMeshMaterial from '~/materials/BasicColorMeshMaterial'

export function getAdditiveFillerMaterial(color: Color) {
  return new BasicColorMeshMaterial({
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
