import { makeSafetyCheckFromConstStringArray } from '@opensky/shared/typeHelpers'
import { Object3D, Vector3 } from 'three'

import { BeamParticleWriter } from '~/controllers/BeamLauncher'
import { MissileParticleWriter } from '~/controllers/MissileLauncher'
import { YadaYadaDurationTags } from '~/helpers/yadaYadaDurationHelper'
import { onNextRenderCallbacks } from '~/renderer'

import Emitter from './Emitter'
import { getPointLayer, getRibbonLayer } from './particleLayerFactory'
import {
  curatedPointLayer,
  curatedRibbonMeshLayers
} from './particleSettingsLib'
import QuadraticPoints from './QuadraticPoints'
import QuadraticRibbonsMesh from './QuadraticRibbonsMesh'

export type ParticleRenderObject = QuadraticRibbonsMesh | QuadraticPoints

export interface LayeredParticleLauncher {
  launch(start: Vector3, end: Vector3): Promise<void>
  startTestVolley(interval?: number): void
}

export interface ParticleSystem {
  particleRenderObjects: ParticleRenderObject[]
  launcher: LayeredParticleLauncher
  writers: MissileParticleWriter[]
}

const CuratedMissileParticleSystemStrings = [
  'fireTrailOnly',
  'fireMissile',
  'lifeTransferMissile',
  'magicMissile',
  'poisonMissile',
  'coinMissile',
  'bloodMissile',
  'hexMissile'
] as const

export type CuratedMissileParticleSystem =
  (typeof CuratedMissileParticleSystemStrings)[number]

const CuratedBeamParticleSystemStrings = [
  'ailingVapors',
  'armorHit',
  'uiSparks',
  'timerSparkler',
  'ropeSparkler',
  'bannerCallOut',
  'daggerSlashes',
  'dustStomps',
  'pebbleSplash',
  'flintSplash',
  'dustPuffs',
  'electricShock',
  'goldenPortalEmbers',
  'evaporatedMagic',
  'evaporatedMagicArrow',
  'evaporatedMagicCircle',
  'elementalSouls',
  'grassFireflies',
  'ambientFireflies',
  'healingVapors',
  'materializeCardFlash',
  'witherDebuff',
  'simpleRibbons',
  'damageHit',
  'simple',
  'debugEffectResolution'
] as const

export type CuratedBeamParticleSystem =
  (typeof CuratedBeamParticleSystemStrings)[number]

export const isCuratedMissileParticleSystem =
  makeSafetyCheckFromConstStringArray(CuratedMissileParticleSystemStrings)

export const isCuratedBeamParticleSystem = makeSafetyCheckFromConstStringArray(
  CuratedBeamParticleSystemStrings
)

export type CuratedParticleSystems =
  | CuratedMissileParticleSystem
  | CuratedBeamParticleSystem

interface BasicParticleAssembly {
  shake?: number
  chargeUpSoundID?: string
  mainSoundID?: string
  explosionSoundID?: string
  blockingDuration: number
}

export interface MissileAssembly extends BasicParticleAssembly {
  particleRenderObjects: ParticleRenderObject[]
  chargeUpWriters: MissileParticleWriter[]
  mainWriters: MissileParticleWriter[]
  explosionWriters: MissileParticleWriter[]
  chargeUpDuration?: number
  distanceToDuration?: (distance: number) => number
  explosionDuration?: number
  missileBody?: Object3D
  mainGatlingTag?: YadaYadaDurationTags
  chargeGatlingTag?: YadaYadaDurationTags
}

export interface BeamAssembly extends BasicParticleAssembly {
  particleRenderObjects: ParticleRenderObject[]
  chargeUpWriters: BeamParticleWriter[]
  mainWriters: BeamParticleWriter[]
  explosionWriters: BeamParticleWriter[]
  chargeUpDuration?: number
  mainDuration?: number
  explosionDuration?: number
  flareEnd?: Object3D
  cloneFlareEndMaterial?: boolean
  flareEndUpdate?: (flare: Object3D, progress: number) => void
  mainGatlingTag?: YadaYadaDurationTags
  chargeGatlingTag?: YadaYadaDurationTags
}

/**
  Launch one of each kind of particle.
  Call this in the loading screen to avoid jank the first time a particle is fired.
*/
export async function prewarmParticleSystem(scene: Object3D): Promise<void> {
  const middle = new Vector3()
  const ribbonLayers: Array<[QuadraticRibbonsMesh, Emitter]> = []
  const pointLayers: Array<[QuadraticPoints, Emitter]> = []
  for (const ribbonLayer of curatedRibbonMeshLayers) {
    const layer = getRibbonLayer(ribbonLayer)
    scene.add(layer)
    const emitter = layer.geometry.createEmitter(middle)
    layer.geometry.update(100)
    ribbonLayers.push([layer, emitter])
  }
  for (const pointLayer of curatedPointLayer) {
    const layer = getPointLayer(pointLayer)
    scene.add(layer)
    const emitter = layer.geometry.createEmitter(middle)
    layer.geometry.update(100)
    pointLayers.push([layer, emitter])
  }
  return new Promise(resolve => {
    onNextRenderCallbacks.push(() => {
      for (const [layer, emitter] of ribbonLayers) {
        scene.remove(layer)
        layer.geometry.destroyEmitter(emitter)
      }
      for (const [layer, emitter] of pointLayers) {
        scene.remove(layer)
        layer.geometry.destroyEmitter(emitter)
      }
      resolve()
    })
  })
}

//ALT IMPLEMENTATION
/*
export async function prewarmParticleSystem(scene: Object3D): Promise<void[]> {
  const middle = new Vector3()
  const ribbonLayers: Array<[QuadraticRibbonsMesh, Emitter]> = []
  const pointLayers: Array<[QuadraticPoints, Emitter]> = []
  for (const ribbonLayer of curatedRibbonMeshLayers) {
    const layer = getRibbonLayer(ribbonLayer)
    scene.add(layer)
    const emitter = layer.geometry.createEmitter(middle)
    layer.geometry.update(100)
    ribbonLayers.push([layer, emitter])
  }
  for (const pointLayer of curatedPointLayer) {
    const layer = getPointLayer(pointLayer)
    scene.add(layer)
    const emitter = layer.geometry.createEmitter(middle)
    layer.geometry.update(100)
    pointLayers.push([layer, emitter])
  }
  const all:Promise<void>[] = []
  ribbonLayers.forEach(f => {
    const [layer, emitter] = f
    return new Promise<void>(resolve => {
      layer.onAfterRender = () => {
        scene.remove(layer)
        layer.geometry.destroyEmitter(emitter)
        resolve()
      }
    })
  })
  return Promise.all(all)
}
*/
