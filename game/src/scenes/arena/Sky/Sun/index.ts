import { BackSide, Mesh, Texture, Vector2 } from 'three'

import { blendModeParams } from '~/helpers/blendModeHelpers'
import BasicMapMeshMaterial from '~/materials/BasicMapMeshMaterial'

import SunGeometry from './Geometry'

export default class Sun extends Mesh<SunGeometry, BasicMapMeshMaterial> {
  constructor(
    texture: Texture,
    textureSize: Vector2,
    radius: number = 80,
    mapRow: number = 10
  ) {
    const material = new BasicMapMeshMaterial(
      {
        map: texture
      },
      {
        transparent: true,
        side: BackSide,
        ...blendModeParams.screen,
        depthWrite: false
      }
    )
    super(
      new SunGeometry(textureSize, 32, undefined, radius, mapRow, 0.06),
      material
    )
    this.frustumCulled = false
  }
}
