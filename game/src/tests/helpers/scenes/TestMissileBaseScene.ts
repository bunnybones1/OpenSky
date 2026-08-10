import { rand } from '@opensky/shared/utils/math'
import { Color } from 'three'

import MagicMissileLauncher, {
  MissileParticleWriter
} from '~/controllers/MissileLauncher'
import colorMakers from '~/factories/colorMakers'
import missileParticlePathMakerLib from '~/meshes/Particles/missileParticlePathMakerLib'
import {
  MissileAssembly,
  ParticleSystem
} from '~/meshes/Particles/particleHelpers'
import QuadraticPoints from '~/meshes/Particles/QuadraticPoints'
import QuadraticRibbonsMesh from '~/meshes/Particles/QuadraticRibbonsMesh'

import { TestParticlesBaseScene } from './TestParticlesBaseScene'

export class TestMissileBaseScene extends TestParticlesBaseScene {
  initParticleSystem(): ParticleSystem {
    const missileAssembly = this.generateParticleEmitters()
    return {
      particleRenderObjects: missileAssembly.particleRenderObjects,
      launcher: new MagicMissileLauncher(this.scene, missileAssembly),
      writers: ([] as MissileParticleWriter[]).concat(
        missileAssembly.chargeUpWriters,
        missileAssembly.mainWriters,
        missileAssembly.explosionWriters
      )
    }
  }

  generateParticleEmitters(): MissileAssembly {
    const colorFireHeadStart = new Color(2, 1, 0.5)
    const colorFireHeadEnd = new Color(1.2, 0.7, 0.2)
    const colorFireStart = new Color(1.2, 1, 0.2)
    const colorFireEnd = new Color(0.9, 0, 0)

    const total = 1000
    const trianglesPerRibbon = 12
    const longFlames = new QuadraticRibbonsMesh({
      name: 'longFlames',
      total: total * 0.1,
      speed: 2,
      trianglesPerRibbon,
      matOptions: {
        // mapTexture: 'brushStroke',
        strokePathFraction: 0.75,
        relativeWidth: 0.03,
        distortionTexture: 'noise3Map',
        distortionStrength: 0.03,
        distortionScale: 2,
        quantizeVertsAlongTime: true,
        blendMode: 'screenAlpha',
        opacity: 0.25,
        taperRibbonOut: true,
        color: colorFireStart,
        colorEnd: colorFireEnd,
        useColorOverTime: true,
        useColorOverOpacity: true
      },
      geomOptions: {
        colorMaker: colorMakers.fire
      }
    })

    const trianglesPerRibbon2 = 12
    const shortFlames = new QuadraticRibbonsMesh({
      name: 'shortFlames',
      total: total * 0.6,
      speed: 10,
      trianglesPerRibbon: trianglesPerRibbon2,
      matOptions: {
        // mapTexture: 'brushStroke',
        strokePathFraction: 1,
        relativeWidth: 0.01,
        // distortionTexture: 'noise3Map',
        // distortionStrength: 0.03,
        // distortionScale: 2,
        quantizeVertsAlongTime: true,
        blendMode: 'screenAlpha',
        opacity: 0.15,
        taperRibbonOut: true,
        // colorMaker: sparkColorMaker,
        color: colorFireHeadStart,
        colorEnd: colorFireHeadEnd,
        useColorOverTime: true,
        useColorOverOpacity: true
      }
    })

    const trianglesPerStrip3 = 2
    const sparks = new QuadraticRibbonsMesh({
      name: 'sparks',
      total: total * 0.2,
      speed: 0.75,
      trianglesPerRibbon: trianglesPerStrip3,
      matOptions: {
        strokePathFraction: 0.025,
        relativeWidth: 0.002,
        distortionTexture: 'noise3Map',
        distortionScale: 0.5,
        distortionStrength: 0.1,
        shapeEase: 'sine',
        opacity: 1
      },
      geomOptions: {
        colorMaker: colorMakers.spark
      }
    })

    const cLow = 0.25
    const cHigh = 0.3

    const smoke = new QuadraticPoints({
      name: 'smoke',
      matOptions: {
        colorTexture: 'smoke',
        distortionTexture: 'noise3Map',
        distortionScale: 1.4,
        distortionStrength: 0.0125,
        speed: 0.5,
        opacity: 0.15,
        blendMode: 'normalAlpha',
        dissipate: true,
        colorLightTop: this._skyLightColor,
        colorLightBottom: this._underLightColor
      },
      geomOptions: {
        total: total * 0.3,
        sizeMin: 50,
        sizeMax: 90,
        colorMaker: (i, color) =>
          color.setRGB(rand(cLow, cHigh), rand(cLow, cHigh), rand(cLow, cHigh))
      }
    })

    return {
      particleRenderObjects: [longFlames, shortFlames, sparks, smoke],
      chargeUpWriters: [
        new MissileParticleWriter(
          longFlames,
          missileParticlePathMakerLib.fireGather,
          50
        )
      ],
      mainWriters: [
        new MissileParticleWriter(
          longFlames,
          missileParticlePathMakerLib.fireTrail,
          40
        ),
        new MissileParticleWriter(
          shortFlames,
          missileParticlePathMakerLib.fireHead,
          1200
        ),
        new MissileParticleWriter(
          sparks,
          missileParticlePathMakerLib.sparksFloating,
          50
        ),
        new MissileParticleWriter(
          smoke,
          missileParticlePathMakerLib.smokeFloating,
          70
        )
      ],
      explosionWriters: [
        new MissileParticleWriter(
          longFlames,
          missileParticlePathMakerLib.fireExplosion,
          100
        ),
        new MissileParticleWriter(
          sparks,
          missileParticlePathMakerLib.sparkExplosion,
          100
        ),
        new MissileParticleWriter(
          smoke,
          missileParticlePathMakerLib.smokeExplosion,
          70
        )
      ],
      blockingDuration: 1000,
      mainGatlingTag: 'missile',
      chargeGatlingTag: 'missileCharge'
    }
  }
}
export const scene = TestMissileBaseScene
