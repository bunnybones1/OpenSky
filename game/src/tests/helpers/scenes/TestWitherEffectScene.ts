import { beamAssemblyLib } from '~/meshes/Particles/beamAssemblyLib'
import { BeamAssembly } from '~/meshes/Particles/particleHelpers'

import { TestBeamBaseScene } from './TestBeamBaseScene'

class TestWitherEffectScene extends TestBeamBaseScene {
  generateParticleEmitters(): BeamAssembly {
    return beamAssemblyLib.witherDebuff()
  }
}
export const scene = TestWitherEffectScene
