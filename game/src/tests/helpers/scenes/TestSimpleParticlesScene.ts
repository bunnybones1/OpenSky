import { beamAssemblyLib } from '~/meshes/Particles/beamAssemblyLib'
import { BeamAssembly } from '~/meshes/Particles/particleHelpers'

import { TestBeamBaseScene } from './TestBeamBaseScene'

class TestSimpleParticlesScene extends TestBeamBaseScene {
  generateParticleEmitters(): BeamAssembly {
    return beamAssemblyLib.simple()
  }
}
export const scene = TestSimpleParticlesScene
