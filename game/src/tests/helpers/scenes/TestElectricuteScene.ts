import { beamAssemblyLib } from '~/meshes/Particles/beamAssemblyLib'
import { BeamAssembly } from '~/meshes/Particles/particleHelpers'

import { TestBeamBaseScene } from './TestBeamBaseScene'

class TestElectricuteScene extends TestBeamBaseScene {
  generateParticleEmitters(): BeamAssembly {
    return beamAssemblyLib.electricShock()
  }
}
export const scene = TestElectricuteScene
