import { beamAssemblyLib } from '~/meshes/Particles/beamAssemblyLib'
import { BeamAssembly } from '~/meshes/Particles/particleHelpers'

import { TestBeamBaseScene } from './TestBeamBaseScene'

class TestAilingVaporsScene extends TestBeamBaseScene {
  generateParticleEmitters(): BeamAssembly {
    return beamAssemblyLib.ailingVapors()
  }
}

export const scene = TestAilingVaporsScene
