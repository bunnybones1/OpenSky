import { Entity } from 'gg'
import { Object3D, Vector3 } from 'three'

import { Components } from '~/components'
import { CuratedBeamParticleSystem } from '~/meshes/Particles/particleHelpers'
import { getBeamLauncher } from '~/meshes/Particles/particleLauncherFactory'
import { findContainingScene, removeFromParent } from '~/utils/threeUtils'

export function emitParticlesInCircle(
  entity: Entity<Components>,
  pos: [Vector3, Vector3],
  beamName: CuratedBeamParticleSystem
) {
  const transform = entity.get('transform')
  const posObjs = pos.map(pos => {
    const p1 = new Object3D()
    p1.position.copy(pos)
    transform.add(p1)
    return p1
  })
  const launcher = getBeamLauncher(beamName, findContainingScene(transform)!)
  const assembly = launcher.startLineEmitter(posObjs[0], posObjs[1])
  return function destroy() {
    assembly.destroy()
    for (const posObj of posObjs) {
      removeFromParent(posObj)
    }
  }
}
