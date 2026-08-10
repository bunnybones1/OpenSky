import { BackSide, Mesh, Texture, Vector2, Vector3 } from 'three'

import BasicMapMeshMaterial from '~/materials/BasicMapMeshMaterial'
import { boobyTrap } from '~/utils/jsUtils'

import SkyDomeGeometry from './Geometry'

export default class SkyDome extends Mesh {
  constructor(
    texture: Texture,
    textureSize: Vector2,
    radius: number = 80,
    overHang: number = 0.5,
    horizonLine: number = 0.5,
    warp = true,
    flipX = false
  ) {
    super(
      new SkyDomeGeometry(
        undefined,
        undefined,
        radius,
        overHang,
        horizonLine,
        0,
        4,
        textureSize,
        warp ? new Vector3(0, radius * 0.5, -radius * 0.9) : undefined
      ),
      new BasicMapMeshMaterial(
        { map: texture },
        {
          side: BackSide,
          fog: false,
          depthWrite: false
        }
      )
    )
    if (flipX) {
      this.scale.x *= -1
    }
    this.frustumCulled = false
    this.name = 'skyDome'
    boobyTrap(this, 'name')
  }
}
