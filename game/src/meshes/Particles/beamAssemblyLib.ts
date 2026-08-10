import { Color, Material, Mesh, Object3D } from 'three'

import { isConquestIsland } from '~/arenaSettings'
import { BeamParticleWriter } from '~/controllers/BeamLauncher'
import {
  applyBlendModeByIndicesToMesh,
  getBlendModeParamsByIndices
} from '~/helpers/blendModeHelpers'
import RGBAVertexColorMeshMaterial from '~/materials/RGBAVertexColorMeshMaterial'
import { Easing } from '~/systems/animation/Easing'

import beamParticlePathMakerLib from './beamParticlePathMakerLib'
import { getFlareGeometry } from './flareGeometryLibrary'
import missileParticlePathMakerLib from './missileParticlePathMakerLib'
import { BeamAssembly, CuratedBeamParticleSystem } from './particleHelpers'
import { getPointLayer, getRibbonLayer } from './particleLayerFactory'

export const beamAssemblyLib: {
  [K in CuratedBeamParticleSystem]: () => BeamAssembly
} = {
  daggerSlashes() {
    const daggerSlashes = getRibbonLayer('daggerSlashes')
    applyBlendModeByIndicesToMesh(daggerSlashes, 4, 5)
    // activateBlendModeDiscovery(getMeshMaterial(daggerSlashes))
    // const data: { [K:string]: Color } = {
    //   start: basicMissileSettings.colorWitherStart,
    //   end: basicMissileSettings.colorWitherEnd
    // }
    // for(const cName of Object.keys(data)) {
    //   const color = data[cName]
    //   const cController = new NiceColorParameter('temp-'+cName, cName, color, 'missiles')
    //   cController.listen(c => color.copy(c))
    // }

    return {
      particleRenderObjects: [daggerSlashes],
      mainDuration: 500,
      chargeUpWriters: [],
      mainWriters: [
        new BeamParticleWriter(
          daggerSlashes,
          beamParticlePathMakerLib.catScratches,
          0,
          100
        )
      ],
      explosionWriters: [],
      shake: 0.4,
      blockingDuration: 100,
      mainSoundID: 'WitherImpact'
    }
  },
  dustStomps() {
    const dustPuffs = getPointLayer('dustPuffs')
    const pebbles = getPointLayer('pebbles')
    return {
      particleRenderObjects: [dustPuffs, pebbles],
      chargeUpWriters: [
        new BeamParticleWriter(
          dustPuffs,
          beamParticlePathMakerLib.dustStompRing,
          0,
          200
        ),
        new BeamParticleWriter(
          pebbles,
          beamParticlePathMakerLib.pebbleSplash,
          0,
          200
        )
      ],
      chargeUpDuration: 200,
      mainWriters: [],
      explosionWriters: [],
      mainDuration: 0,
      blockingDuration: 200
    }
  },
  pebbleSplash() {
    const pebbles = getPointLayer('pebbles')
    return {
      particleRenderObjects: [pebbles],
      chargeUpWriters: [
        new BeamParticleWriter(
          pebbles,
          beamParticlePathMakerLib.pebbleSplash,
          0,
          200
        )
      ],
      chargeUpDuration: 200,
      mainWriters: [],
      explosionWriters: [],
      mainDuration: 0,
      blockingDuration: 200
    }
  },
  flintSplash() {
    const pebbles = getPointLayer('flint')
    const sparks = getRibbonLayer('flintSparks')
    return {
      particleRenderObjects: [pebbles, sparks],
      chargeUpWriters: [
        new BeamParticleWriter(
          pebbles,
          beamParticlePathMakerLib.pebbleSplash,
          0,
          100
        ),
        new BeamParticleWriter(
          sparks,
          beamParticlePathMakerLib.pebbleSplash,
          0,
          25
        )
      ],
      chargeUpDuration: 100,
      mainWriters: [],
      explosionWriters: [],
      mainDuration: 0,
      blockingDuration: 200
    }
  },
  dustPuffs() {
    const dustPuffs = getPointLayer('dustPuffs')
    const pebbles = getPointLayer('pebbles')

    return {
      particleRenderObjects: [dustPuffs, pebbles],
      chargeUpWriters: [
        new BeamParticleWriter(
          dustPuffs,
          beamParticlePathMakerLib.dustStompRingLite,
          0,
          100
        ),
        new BeamParticleWriter(
          pebbles,
          beamParticlePathMakerLib.pebbleSplash,
          0,
          200
        )
      ],
      chargeUpDuration: 100,
      mainWriters: [],
      explosionWriters: [],
      mainDuration: 0,
      blockingDuration: 0
    }
  },
  electricShock() {
    const longArcs = getRibbonLayer('electricArcsLong')

    const shortArcs = getRibbonLayer('electricArcsShort')

    const sparks = getRibbonLayer('electricSparks')

    // activateBlendModeDiscovery(getMeshMaterial(longArcs))
    // const data: { [K:string]: Color } = {
    //   start: basicElectricArcSettings.colorElectricArcStart,
    //   end: basicElectricArcSettings.colorElectricArcEnd
    // }
    // for(const cName of Object.keys(data)) {
    //   const color = data[cName]
    //   const cController = new NiceColorParameter('temp3-'+cName, cName, color, 'missiles')
    //   cController.listen(c => color.copy(c))
    // }
    const glowingDust = getPointLayer('glowingDust')

    const smoke = getPointLayer('electricSmoke')
    smoke.renderOrder = -100

    for (const mesh of [longArcs, shortArcs]) {
      applyBlendModeByIndicesToMesh(mesh, 6, 5)
    }

    const flareMat = new RGBAVertexColorMeshMaterial(
      {
        screenspaceMode: true,
        blendMode: 'customAddAlpha',
        premultiplyAlpha: true,
        opacity: 0.7
      },
      {
        transparent: true,
        depthWrite: false,
        ...getBlendModeParamsByIndices(1, 1)
      }
    )

    const flareEnd = new Mesh(
      getFlareGeometry('electric', new Color(4, 3, 0), new Color(-5, -5, -6)),
      flareMat
    )
    flareEnd.renderOrder = 100
    const flareWrapper = new Object3D()
    flareWrapper.add(flareEnd)
    return {
      flareEnd: flareWrapper,
      particleRenderObjects: [longArcs, shortArcs, sparks, smoke, glowingDust],
      chargeUpWriters: [
        new BeamParticleWriter(
          shortArcs,
          beamParticlePathMakerLib.chargeUpArc,
          0,
          30
        ),
        new BeamParticleWriter(
          glowingDust,
          beamParticlePathMakerLib.chargeUpStaticDust,
          0,
          100
        )
      ],
      mainWriters: [
        new BeamParticleWriter(
          longArcs,
          beamParticlePathMakerLib.fullArc,
          0,
          40
        ),
        new BeamParticleWriter(
          shortArcs,
          beamParticlePathMakerLib.ricochetArc,
          60
        ),
        new BeamParticleWriter(
          shortArcs,
          beamParticlePathMakerLib.blast,
          0,
          30
        ),
        new BeamParticleWriter(
          sparks,
          beamParticlePathMakerLib.metalSparksJumping,
          0,
          20
        ),
        new BeamParticleWriter(
          smoke,
          beamParticlePathMakerLib.smokeFloating,
          0,
          40
        )
      ],
      explosionWriters: [
        new BeamParticleWriter(
          shortArcs,
          beamParticlePathMakerLib.ricochetArc,
          0,
          30
        )
      ],
      shake: 0.4,
      chargeUpSoundID: 'SpellElectricChargeUp',
      mainSoundID: 'SpellElectricImpact',
      blockingDuration: 500
    }
  },

  debugEffectResolution() {
    const longArcs = getRibbonLayer('debugGradientLine')

    return {
      flareEnd: undefined,
      particleRenderObjects: [longArcs],
      chargeUpWriters: [],
      mainWriters: [
        new BeamParticleWriter(
          longArcs,
          beamParticlePathMakerLib.fullArc,
          0,
          60,
          undefined,
          120,
          () => 1
        )
      ],
      explosionWriters: [],
      blockingDuration: 500
    }
  },
  simpleRibbons() {
    const longArcs = getRibbonLayer('simpleLines')

    applyBlendModeByIndicesToMesh(longArcs, 6, 5)

    return {
      particleRenderObjects: [longArcs],
      chargeUpWriters: [],
      mainWriters: [
        new BeamParticleWriter(
          longArcs,
          beamParticlePathMakerLib.simplePath,
          0,
          40
        )
      ],
      explosionWriters: [],
      blockingDuration: 500
    }
  },
  healingVapors() {
    const healingOrbs = getPointLayer('healingOrbs')

    return {
      particleRenderObjects: [healingOrbs],
      chargeUpWriters: [
        new BeamParticleWriter(
          healingOrbs,
          beamParticlePathMakerLib.healingVapor,
          0,
          220
        )
      ],
      chargeUpDuration: 1000,
      mainWriters: [],
      explosionWriters: [],
      mainDuration: 0,
      chargeUpSoundID: 'Buff',
      blockingDuration: 200
    }
  },
  grassFireflies() {
    const fireflies = getPointLayer('fireflies')

    return {
      particleRenderObjects: [fireflies],
      chargeUpWriters: [
        new BeamParticleWriter(
          fireflies,
          beamParticlePathMakerLib.grassFireflies,
          0,
          120
        )
      ],
      chargeUpDuration: 150,
      mainWriters: [],
      explosionWriters: [],
      mainDuration: 0,
      blockingDuration: 200
    }
  },
  ambientFireflies() {
    const fireflies = getPointLayer('fireflies')
    const fireflyRate = isConquestIsland ? 2 : 11

    return {
      particleRenderObjects: [fireflies],
      chargeUpWriters: [],
      chargeUpDuration: 150,
      mainWriters: [
        new BeamParticleWriter(
          fireflies,
          beamParticlePathMakerLib.grassFireflies,
          0,
          fireflyRate
        )
      ],
      explosionWriters: [],
      mainDuration: 0,
      blockingDuration: 200
    }
  },
  ailingVapors() {
    const healingOrbs = getPointLayer('healingOrbs')

    return {
      particleRenderObjects: [healingOrbs],
      chargeUpWriters: [
        new BeamParticleWriter(
          healingOrbs,
          beamParticlePathMakerLib.ailingVapor,
          0,
          60
        )
      ],
      chargeUpDuration: 1000,
      mainWriters: [],
      explosionWriters: [],
      mainDuration: 0,
      chargeUpSoundID: 'Debuff',
      blockingDuration: 200
    }
  },
  evaporatedMagicArrow() {
    const embers = getRibbonLayer('evaporatedMagicFast')

    return {
      particleRenderObjects: [embers],
      chargeUpWriters: [],
      chargeUpDuration: 0,
      mainWriters: [
        new BeamParticleWriter(
          embers,
          beamParticlePathMakerLib.evaporatingMagicSparksShort,
          0,
          100
        )
      ],
      explosionWriters: [],
      mainDuration: 200,
      // chargeUpSoundID: 'Debuff',
      blockingDuration: 200
    }
  },
  evaporatedMagic() {
    const embers = getRibbonLayer('evaporatedMagic')

    return {
      particleRenderObjects: [embers],
      chargeUpWriters: [],
      chargeUpDuration: 0,
      mainWriters: [
        new BeamParticleWriter(
          embers,
          beamParticlePathMakerLib.evaporatingMagicSparks,
          0,
          20
        )
      ],
      explosionWriters: [],
      mainDuration: 200,
      // chargeUpSoundID: 'Debuff',
      blockingDuration: 200
    }
  },
  evaporatedMagicCircle() {
    const embers = getRibbonLayer('evaporatedMagic')

    return {
      particleRenderObjects: [embers],
      chargeUpWriters: [],
      chargeUpDuration: 0,
      mainWriters: [
        new BeamParticleWriter(
          embers,
          beamParticlePathMakerLib.evaporatingMagicSparksCircle,
          0,
          100
        )
      ],
      explosionWriters: [],
      mainDuration: 200,
      // chargeUpSoundID: 'Debuff',
      blockingDuration: 200
    }
  },
  elementalSouls() {
    const embers = getPointLayer('elementalSouls')
    applyBlendModeByIndicesToMesh(embers, 2, 5)

    return {
      particleRenderObjects: [embers],
      chargeUpWriters: [],
      chargeUpDuration: 0,
      mainWriters: [
        new BeamParticleWriter(
          embers,
          beamParticlePathMakerLib.elementalSoulFloat,
          0,
          1
        )
      ],
      explosionWriters: [],
      mainDuration: 200,
      // chargeUpSoundID: 'Debuff',
      blockingDuration: 200
    }
  },
  goldenPortalEmbers() {
    const embers = getRibbonLayer('goldenPortalSparks')

    return {
      particleRenderObjects: [embers],
      chargeUpWriters: [
        new BeamParticleWriter(
          embers,
          missileParticlePathMakerLib.fireGatherBig,
          0,
          500
        )
      ],
      chargeUpDuration: 1000,
      mainWriters: [],
      explosionWriters: [],
      mainDuration: 0,
      // chargeUpSoundID: 'Debuff',
      blockingDuration: 200
    }
  },
  witherDebuff() {
    const witherTendrils = getRibbonLayer('witherTendrils')
    applyBlendModeByIndicesToMesh(witherTendrils, 4, 5)

    const witherFumes = getPointLayer('witherFumes')
    applyBlendModeByIndicesToMesh(witherFumes, 1, 5)

    const darkSparks = getRibbonLayer('darkSparks')
    applyBlendModeByIndicesToMesh(darkSparks, 6, 5)

    // activateBlendModeDiscovery(getMeshMaterial(darkSparks))
    // const data: { [K: string]: Color } = {
    //   start: basicMissileSettings.colorWitherFumesStart,
    //   end: basicMissileSettings.colorWitherFumesEnd
    // }
    // for (const cName of Object.keys(data)) {
    //   const color = data[cName]
    //   const cController = new NiceColorParameter(
    //     'temp3-' + cName,
    //     cName,
    //     color,
    //     'missiles'
    //   )
    //   cController.listen(c => color.copy(c))
    // }

    return {
      particleRenderObjects: [witherFumes, witherTendrils, darkSparks],
      chargeUpWriters: [
        new BeamParticleWriter(
          witherFumes,
          beamParticlePathMakerLib.witherVapor,
          0,
          36
        ),
        new BeamParticleWriter(
          witherTendrils,
          beamParticlePathMakerLib.drippingTendrils,
          0,
          60
        ),
        new BeamParticleWriter(
          darkSparks,
          beamParticlePathMakerLib.sparksFromEnd,
          0,
          400
        )
      ],
      chargeUpDuration: 500,
      mainWriters: [],
      explosionWriters: [],
      mainDuration: 0,
      chargeUpSoundID: 'WitherImpact',
      blockingDuration: 200
    }
  },
  armorHit() {
    const longArcs = getRibbonLayer('armorArcsLong')

    const glowingDust = getRibbonLayer('armorSparks')

    // activateBlendModeDiscovery(getMeshMaterial(longArcs))
    // const data: { [K:string]: Color } = {
    //   start: basicArmorArcSettings.colorArmorArcStart,
    //   end: basicArmorArcSettings.colorArmorArcEnd
    // }
    // for(const cName of Object.keys(data)) {
    //   const color = data[cName]
    //   const cController = new NiceColorParameter('temp3-'+cName, cName, color, 'missiles')
    //   cController.listen(c => color.copy(c))
    // }

    for (const mesh of [longArcs, glowingDust]) {
      applyBlendModeByIndicesToMesh(mesh, 2, 5)
    }

    return {
      particleRenderObjects: [longArcs, glowingDust],
      chargeUpWriters: [],
      mainDuration: 500,
      chargeUpDuration: 0,
      mainWriters: [
        new BeamParticleWriter(
          longArcs,
          beamParticlePathMakerLib.rippleRings,
          0,
          60
        ),
        new BeamParticleWriter(
          glowingDust,
          beamParticlePathMakerLib.dustFloatFromRings,
          0,
          100
        )
      ],
      explosionWriters: [],
      shake: 0,
      // mainSoundID: 'SpellElectricImpact',
      blockingDuration: 0
    }
  },
  damageHit() {
    const damageSplashLongSkinny = getRibbonLayer('damageSplashLongSkinny')
    const damageSplashShortFat = getRibbonLayer('damageSplashShortFat')

    damageSplashLongSkinny.renderOrder += 1000
    damageSplashShortFat.renderOrder += 1000

    // activateBlendModeDiscovery(getMeshMaterial(longArcs))
    // const data: { [K:string]: Color } = {
    //   start: basicArmorArcSettings.colorArmorArcStart,
    //   end: basicArmorArcSettings.colorArmorArcEnd
    // }
    // for(const cName of Object.keys(data)) {
    //   const color = data[cName]
    //   const cController = new NiceColorParameter('temp3-'+cName, cName, color, 'missiles')
    //   cController.listen(c => color.copy(c))
    // }

    const flareMat = new RGBAVertexColorMeshMaterial(
      {
        screenspaceMode: true,
        blendMode: 'customAddAlpha',
        premultiplyAlpha: true,
        opacity: 0.7
      },
      {
        transparent: true,
        depthWrite: false,
        depthTest: false,
        ...getBlendModeParamsByIndices(1, 1)
      }
    )

    const flareEndMesh = new Mesh(
      getFlareGeometry('damageHit', new Color(3, 0, 0), new Color(6, 0.5, 0)),
      flareMat
    )
    flareEndMesh.renderOrder = 100
    return {
      flareEnd: flareEndMesh,
      cloneFlareEndMaterial: true,
      flareEndUpdate: (flareEnd, progress) => {
        if (flareEnd instanceof Mesh && flareEnd.material instanceof Material) {
          flareEnd.material.opacity = Easing.Custom.Pulse(progress)
        }
        flareEnd.scale.x = 0.75 + 0.25 * progress
      },
      particleRenderObjects: [damageSplashLongSkinny, damageSplashShortFat],
      chargeUpWriters: [],
      mainDuration: 400,
      chargeUpDuration: 0,
      mainWriters: [
        new BeamParticleWriter(
          damageSplashLongSkinny,
          beamParticlePathMakerLib.shineAroundTarget3,
          0,
          600,
          0.5,
          50
        ),
        new BeamParticleWriter(
          damageSplashShortFat,
          beamParticlePathMakerLib.shineAroundTarget4,
          0,
          100,
          0.5,
          6
        )
      ],
      explosionWriters: [],
      shake: 0,
      // mainSoundID: 'SpellElectricImpact',
      blockingDuration: 0
    }
  },
  simple() {
    const damageSplashShortFat = getRibbonLayer('damageSplashShortFat')

    damageSplashShortFat.renderOrder += 1000

    // activateBlendModeDiscovery(getMeshMaterial(longArcs))
    // const data: { [K:string]: Color } = {
    //   start: basicArmorArcSettings.colorArmorArcStart,
    //   end: basicArmorArcSettings.colorArmorArcEnd
    // }
    // for(const cName of Object.keys(data)) {
    //   const color = data[cName]
    //   const cController = new NiceColorParameter('temp3-'+cName, cName, color, 'missiles')
    //   cController.listen(c => color.copy(c))
    // }

    const flareMat = new RGBAVertexColorMeshMaterial(
      {
        screenspaceMode: true,
        blendMode: 'customAddAlpha',
        premultiplyAlpha: true,
        opacity: 0.7
      },
      {
        transparent: true,
        depthWrite: false,
        depthTest: false,
        ...getBlendModeParamsByIndices(1, 1)
      }
    )

    const flareEndMesh = new Mesh(
      getFlareGeometry('damageHit', new Color(3, 0, 0), new Color(6, 0.5, 0)),
      flareMat
    )
    flareEndMesh.renderOrder = 100
    return {
      flareEnd: flareEndMesh,
      cloneFlareEndMaterial: true,
      flareEndUpdate: (flareEnd, progress) => {
        if (flareEnd instanceof Mesh && flareEnd.material instanceof Material) {
          flareEnd.material.opacity = Easing.Custom.Pulse(progress)
        }
        flareEnd.scale.x = 0.75 + 0.25 * progress
      },
      particleRenderObjects: [damageSplashShortFat],
      chargeUpWriters: [],
      mainDuration: 400,
      chargeUpDuration: 0,
      mainWriters: [
        new BeamParticleWriter(
          damageSplashShortFat,
          beamParticlePathMakerLib.shineAroundTarget4,
          0,
          100,
          1,
          6
        )
      ],
      explosionWriters: [],
      shake: 0,
      // mainSoundID: 'SpellElectricImpact',
      blockingDuration: 0
    }
  },
  uiSparks() {
    const glowingDust = getRibbonLayer('uiSparks')
    glowingDust.renderOrder = 20
    for (const mesh of [glowingDust]) {
      applyBlendModeByIndicesToMesh(mesh, 2, 5)
    }

    return {
      particleRenderObjects: [glowingDust],
      chargeUpWriters: [],
      mainDuration: 500,
      chargeUpDuration: 0,
      mainWriters: [
        new BeamParticleWriter(
          glowingDust,
          beamParticlePathMakerLib.uiDustFloat,
          1,
          0,
          10
        )
      ],
      explosionWriters: [],
      shake: 0,
      // mainSoundID: 'SpellElectricImpact',
      blockingDuration: 0
    }
  },
  timerSparkler() {
    const timerSparks = getPointLayer('timerSparks')
    timerSparks.renderOrder = 33.5
    // for (const mesh of [timerSparks]) {
    //   applyBlendModeByIndicesToMesh(mesh, 2, 5)
    // }

    return {
      particleRenderObjects: [timerSparks],
      chargeUpWriters: [],
      mainDuration: 500,
      chargeUpDuration: 0,
      mainWriters: [
        new BeamParticleWriter(
          timerSparks,
          beamParticlePathMakerLib.uiSparksRandom,
          140,
          10
        )
      ],
      explosionWriters: [],
      shake: 0,
      // mainSoundID: 'SpellElectricImpact',
      blockingDuration: 0
    }
  },
  ropeSparkler() {
    const sparks = getPointLayer('ropeSparks')
    sparks.renderOrder = -1000

    return {
      particleRenderObjects: [sparks],
      chargeUpWriters: [],
      mainDuration: 500,
      chargeUpDuration: 0,
      mainWriters: [
        new BeamParticleWriter(
          sparks,
          beamParticlePathMakerLib.ropeSparksRandom,
          1000,
          40
        )
      ],
      explosionWriters: [],
      shake: 0,
      // mainSoundID: 'SpellElectricImpact',
      blockingDuration: 0
    }
  },
  materializeCardFlash() {
    const longArcs = getRibbonLayer('bannerLightShafts')
    applyBlendModeByIndicesToMesh(longArcs, 6, 1)

    const glowingDust = getRibbonLayer('armorSparks')

    // activateBlendModeDiscovery(getMeshMaterial(longArcs))
    // const data: { [K:string]: Color } = {
    //   start: basicArmorArcSettings.colorArmorArcStart,
    //   end: basicArmorArcSettings.colorArmorArcEnd
    // }
    // for(const cName of Object.keys(data)) {
    //   const color = data[cName]
    //   const cController = new NiceColorParameter('temp3-'+cName, cName, color, 'missiles')
    //   cController.listen(c => color.copy(c))
    // }

    for (const mesh of [glowingDust]) {
      applyBlendModeByIndicesToMesh(mesh, 2, 5)
    }

    return {
      particleRenderObjects: [longArcs, glowingDust],
      chargeUpWriters: [],
      mainDuration: 1500,
      chargeUpDuration: 0,
      mainWriters: [
        new BeamParticleWriter(
          longArcs,
          beamParticlePathMakerLib.shineAroundTarget2,
          0,
          160
        ),
        new BeamParticleWriter(
          glowingDust,
          beamParticlePathMakerLib.dustFloatFromRings,
          0,
          100
        )
      ],
      explosionWriters: [],
      shake: 0,
      // mainSoundID: 'SpellElectricImpact',
      blockingDuration: 0
    }
  },
  bannerCallOut() {
    const bannerLightShafts = getRibbonLayer('bannerLightShafts')
    applyBlendModeByIndicesToMesh(bannerLightShafts, 6, 1)

    // activateBlendModeDiscovery(getMeshMaterial(bannerLightShafts))
    // const data: { [K: string]: Color } = {
    //   start: basicBannerSettings.colorLightShaftStart,
    //   end: basicBannerSettings.colorLightShaftEnd
    // }
    // for (const cName of Object.keys(data)) {
    //   const color = data[cName]
    //   const cController = new NiceColorParameter(
    //     'temp4-' + cName,
    //     cName,
    //     color,
    //     'missiles'
    //   )
    //   cController.listen(c => color.copy(c))
    // }

    return {
      particleRenderObjects: [bannerLightShafts],
      chargeUpWriters: [
        new BeamParticleWriter(
          bannerLightShafts,
          beamParticlePathMakerLib.shineToSky,
          0,
          24
        ),
        new BeamParticleWriter(
          bannerLightShafts,
          beamParticlePathMakerLib.shineFromSky,
          0,
          30
        ),
        new BeamParticleWriter(
          bannerLightShafts,
          beamParticlePathMakerLib.shineAroundTarget,
          0,
          30
        )
      ],
      chargeUpDuration: 1000,
      mainWriters: [],
      explosionWriters: [],
      mainDuration: 0,
      // chargeUpSoundID: 'WitherImpact',
      blockingDuration: 200
    }
  }
}
