import { Scene } from 'three'

import BeamLauncher from '~/controllers/BeamLauncher'
import MissileLauncher from '~/controllers/MissileLauncher'

import { beamAssemblyLib } from './beamAssemblyLib'
import { missileAssemblyLib } from './missileAssemblyLib'
import {
  BeamAssembly,
  CuratedBeamParticleSystem,
  CuratedMissileParticleSystem
} from './particleHelpers'
const __particleMissileLauncherAssemblyRegistry = new Map<
  CuratedMissileParticleSystem,
  MissileLauncher
>()
export function getMissileLauncher(
  name: CuratedMissileParticleSystem,
  scene: Scene
) {
  if (__particleMissileLauncherAssemblyRegistry.has(name)) {
    return __particleMissileLauncherAssemblyRegistry.get(name)!
  } else {
    const missileAssembly = missileAssemblyLib[name]()

    for (const pro of missileAssembly.particleRenderObjects) {
      scene.add(pro)
    }

    const launcher = new MissileLauncher(scene, missileAssembly)

    __particleMissileLauncherAssemblyRegistry.set(name, launcher)
    return launcher
  }
}

const __particleBeamLauncherRegistry = new Map<
  CuratedBeamParticleSystem,
  BeamLauncher
>()
const __particleBeamAssemblyRegistry = new Map<
  CuratedBeamParticleSystem,
  BeamAssembly
>()
export function getBeamLauncher(name: CuratedBeamParticleSystem, scene: Scene) {
  if (__particleBeamLauncherRegistry.has(name)) {
    for (const pro of __particleBeamAssemblyRegistry.get(name)!
      .particleRenderObjects) {
      if (pro.parent !== scene) {
        scene.add(pro)
      }
    }
    return __particleBeamLauncherRegistry.get(name)!
  } else {
    const assembly = beamAssemblyLib[name]()

    for (const pro of assembly.particleRenderObjects) {
      scene.add(pro)
    }

    const launcher = new BeamLauncher(scene, assembly)

    __particleBeamAssemblyRegistry.set(name, assembly)
    __particleBeamLauncherRegistry.set(name, launcher)
    return launcher
  }
}
