import { Mesh } from 'three'

import { GeometryEmitterAssembly } from '~/controllers/BeamLauncher'
import { CuratedBeamParticleSystem } from '~/meshes/Particles/particleHelpers'
import { getBeamLauncher } from '~/meshes/Particles/particleLauncherFactory'
import { findContainingScene } from '~/utils/threeUtils'

export function emitParticlesFromGeometry(
  mesh: Mesh,
  beamName: CuratedBeamParticleSystem,
  normalsScale = 1
) {
  const launcher = getBeamLauncher(beamName, findContainingScene(mesh)!)
  const assembly: GeometryEmitterAssembly = launcher.startGeometryEmitter(
    mesh,
    normalsScale
  )
  return function destroy() {
    assembly.destroy()
  }
}
