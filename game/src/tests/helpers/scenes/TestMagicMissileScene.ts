import { missileAssemblyLib } from '~/meshes/Particles/missileAssemblyLib'
import { MissileAssembly } from '~/meshes/Particles/particleHelpers'

import { TestMissileBaseScene } from './TestMissileBaseScene'

class TestMagicMissileScene extends TestMissileBaseScene {
  generateParticleEmitters(): MissileAssembly {
    return missileAssemblyLib.magicMissile()
  }
}
export const scene = TestMagicMissileScene
