import { missileAssemblyLib } from '~/meshes/Particles/missileAssemblyLib'
import { MissileAssembly } from '~/meshes/Particles/particleHelpers'

import { TestMissileBaseScene } from './TestMissileBaseScene'

class TestFireMissileScene extends TestMissileBaseScene {
  generateParticleEmitters(): MissileAssembly {
    return missileAssemblyLib.fireMissile()
  }
}
export const scene = TestFireMissileScene
