import { beamAssemblyLib } from '~/meshes/Particles/beamAssemblyLib'
import { BeamAssembly } from '~/meshes/Particles/particleHelpers'

import { TestBeamBaseScene } from './TestBeamBaseScene'

class TestBannerCallOutScene extends TestBeamBaseScene {
  generateParticleEmitters(): BeamAssembly {
    return beamAssemblyLib.bannerCallOut()
  }
}

export const scene = TestBannerCallOutScene
