import { Color } from 'three'

import BeamLauncher, { BeamParticleWriter } from '~/controllers/BeamLauncher'
import colorMakers from '~/factories/colorMakers'
import beamParticlePathMakerLib from '~/meshes/Particles/beamParticlePathMakerLib'
import {
  BeamAssembly,
  ParticleSystem
} from '~/meshes/Particles/particleHelpers'
import QuadraticRibbonsMesh from '~/meshes/Particles/QuadraticRibbonsMesh'

import { TestParticlesBaseScene } from './TestParticlesBaseScene'

export class TestBeamBaseScene extends TestParticlesBaseScene {
  initParticleSystem(): ParticleSystem {
    const beamAssembly = this.generateParticleEmitters()
    return {
      particleRenderObjects: beamAssembly.particleRenderObjects,
      launcher: new BeamLauncher(this.scene, beamAssembly),
      writers: ([] as BeamParticleWriter[]).concat(
        beamAssembly.chargeUpWriters,
        beamAssembly.mainWriters,
        beamAssembly.explosionWriters
      )
    }
  }
  generateParticleEmitters(): BeamAssembly {
    const colorArcShortStart = new Color(2, 1, 0.5)
    const colorArcShortEnd = new Color(1.2, 0.7, 0.2)
    const colorArcStart = new Color(1.2, 1, 0.2)
    const colorArcEnd = new Color(0.9, 0, 0)

    const total = 1000
    const trianglesPerRibbon = 48
    const longArcs = new QuadraticRibbonsMesh({
      name: 'longArcs',
      total: total * 0.1,
      speed: 6,
      trianglesPerRibbon,
      matOptions: {
        // mapTexture: getAssetsManager().getAsset('brushStroke'),
        strokePathFraction: 1.0,
        relativeWidth: 0.02,
        distortionTexture: 'noise3Map',
        distortionStrength: 0.2,
        distortionScale: 4,
        quantizeVertsAlongTime: true,
        blendMode: 'customAddAlpha',
        opacity: 0.15,
        taperRibbonOut: false,
        color: colorArcStart,
        colorEnd: colorArcEnd,
        useColorOverTime: false,
        useColorOverOpacity: true,
        distortionTaper: 'inout'
      },
      geomOptions: {
        colorMaker: colorMakers.fire
      }
    })

    const trianglesPerRibbon2 = 12
    const shortArcs = new QuadraticRibbonsMesh({
      name: 'shortArcs',
      total: total * 0.6,
      speed: 10,
      trianglesPerRibbon: trianglesPerRibbon2,
      matOptions: {
        // mapTexture: 'brushStroke',
        strokePathFraction: 1,
        relativeWidth: 0.01,
        distortionTexture: 'noise3Map',
        distortionStrength: 0.03,
        distortionScale: 2,
        quantizeVertsAlongTime: true,
        blendMode: 'screenAlpha',
        opacity: 0.15,
        taperRibbonOut: true,
        // colorMaker: sparkColorMaker,
        color: colorArcShortStart,
        colorEnd: colorArcShortEnd,
        useColorOverTime: true,
        useColorOverOpacity: true
      }
    })

    return {
      particleRenderObjects: [longArcs, shortArcs],
      chargeUpWriters: [
        new BeamParticleWriter(
          shortArcs,
          beamParticlePathMakerLib.chargeUpArc,
          140
        )
      ],
      mainWriters: [
        new BeamParticleWriter(longArcs, beamParticlePathMakerLib.fullArc, 140)
      ],
      explosionWriters: [
        new BeamParticleWriter(
          shortArcs,
          beamParticlePathMakerLib.ricochetArc,
          140
        )
      ],
      blockingDuration: 1000
    }
  }
}
export const scene = TestBeamBaseScene
