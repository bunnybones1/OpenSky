import { Object3D } from 'three'

import { EmitterAssembly } from '~/controllers/BeamLauncher'
import { I2D, isI2D } from '~/helpers/I2D'
import { Pin } from '~/helpers/LayoutHelpers'
import Object2D from '~/meshes/Object2D'
import { ColorMaker } from '~/meshes/Particles/ColorMaker'
import { CuratedBeamParticleSystem } from '~/meshes/Particles/particleHelpers'
import { getBeamLauncher } from '~/meshes/Particles/particleLauncherFactory'
import { findContainingScene, removeFromParent } from '~/utils/threeUtils'

interface ParticlesInLineShape {
  assemblies: EmitterAssembly[]
  destroy: () => void
}

export function emitParticlesInLineShape(
  transform: Object3D,
  coords: ReadonlyArray<readonly [number, number, number]>,
  beamName: CuratedBeamParticleSystem,
  colorMaker?: ColorMaker
): ParticlesInLineShape
export function emitParticlesInLineShape(
  transform: I2D,
  coords: ReadonlyArray<readonly [number, number]>,
  beamName: CuratedBeamParticleSystem,
  colorMaker?: ColorMaker
): ParticlesInLineShape
export function emitParticlesInLineShape(
  transform: Object3D,
  coords: ReadonlyArray<ReadonlyArray<number>>,
  beamName: CuratedBeamParticleSystem,
  colorMaker?: ColorMaker
) {
  const is2D = isI2D(transform)
  const posObjs = coords.map(coord => {
    if (is2D) {
      const posObj = new Object2D()
      posObj.matrix.setConstraintsPosition(Pin.fromPixels(coord[0], coord[1]))
      transform.add(posObj)
      return posObj
    } else {
      const posObj = new Object3D()
      posObj.position.fromArray(coord)
      transform.add(posObj)
      return posObj
    }
  })
  transform.updateMatrixWorld()
  const assemblies: EmitterAssembly[] = []
  for (let i = 0; i < posObjs.length; i++) {
    const pos1 = posObjs[i]
    const pos2 = posObjs[(i + 1) % posObjs.length]
    const launcher = getBeamLauncher(beamName, findContainingScene(transform)!)
    assemblies.push(launcher.startLineEmitter(pos1, pos2, colorMaker))
  }
  return {
    assemblies,
    destroy() {
      for (const assembly of assemblies) {
        assembly.destroy()
      }
      for (const posObj of posObjs) {
        removeFromParent(posObj)
      }
    }
  }
}
