import { BufferGeometry, Mesh } from 'three'

import { getAssetsManager } from '~/assets'
import FakeCylinderGlowMeshMaterial from '~/materials/FakeCylinderGlowMeshMaterial'

import { findObject3DByName } from '../../../utils/threeUtils'
import { BaseTestScene } from './BaseTestScene'

class TestFakeCylinderGlowScene extends BaseTestScene {
  glow: Mesh<BufferGeometry, FakeCylinderGlowMeshMaterial> | undefined
  constructor() {
    super()
    getAssetsManager()
      .loadAsset('fakeCylinderGlow')
      .then(glowScene => {
        const glowProto = findObject3DByName(glowScene, 'fake-cylinder-glow')
        const glow = glowProto.clone() as Mesh<
          BufferGeometry,
          FakeCylinderGlowMeshMaterial
        >
        glow.scale.setScalar(0.1)
        this.scene.add(glow)
        this.glow = glow
      })
  }
  update() {
    if (this.glow) {
      this.glow.material.angle = performance.now() * 0.015
    }
  }
}

export const scene = TestFakeCylinderGlowScene
