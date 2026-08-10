import { missileAssemblyLib } from '~/meshes/Particles/missileAssemblyLib'
import { MissileAssembly } from '~/meshes/Particles/particleHelpers'

import { TestMissileBaseScene } from './TestMissileBaseScene'

class TestLifeTransferMissileScene extends TestMissileBaseScene {
  generateParticleEmitters(): MissileAssembly {
    return missileAssemblyLib.lifeTransferMissile()
  }
}
export const scene = TestLifeTransferMissileScene
