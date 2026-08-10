import { Color, Mesh, Object3D } from 'three'

import { MissileParticleWriter } from '~/controllers/MissileLauncher'
import colorMakers from '~/factories/colorMakers'
import { applyBlendModeByIndicesToMesh } from '~/helpers/blendModeHelpers'
import RGBAVertexColorMeshMaterial from '~/materials/RGBAVertexColorMeshMaterial'

import { getFlareGeometry } from './flareGeometryLibrary'
import missileParticlePathMakerLib from './missileParticlePathMakerLib'
import {
  CuratedMissileParticleSystem,
  MissileAssembly
} from './particleHelpers'
import { getPointLayer, getRibbonLayer } from './particleLayerFactory'
import { basicMissileSettings } from './particleSettingsLib'

export const missileAssemblyLib: {
  [K in CuratedMissileParticleSystem]: () => MissileAssembly
} = {
  fireTrailOnly() {
    const longFlames = getRibbonLayer('flamesLong')

    const shortFlames = getRibbonLayer('flamesShort')

    // activateBlendModeDiscovery(getMeshMaterial(longFlames))
    // activateBlendModeDiscovery(getMeshMaterial(shortFlames))
    // const data: { [K:string]: Color } = {
    //   start: basicMissileSettings.colorFireStart,
    //   end: basicMissileSettings.colorFireEnd,
    //   headStart: basicMissileSettings.colorFireHeadStart,
    //   headEnd: basicMissileSettings.colorFireHeadEnd
    // }
    // for(const cName of Object.keys(data)) {
    //   const color = data[cName]
    //   const cController = new NiceColorParameter('temp2-'+cName, cName, color, 'missiles')
    //   cController.listen(c => color.copy(c))
    // }

    const sparks = getRibbonLayer('sparks')

    const smoke = getPointLayer('smoke')
    smoke.renderOrder = -100

    const bodyPrototype = new Object3D()

    const bulletMat = new RGBAVertexColorMeshMaterial(
      {
        screenspaceMode: true,
        blendMode: 'screenAlpha',
        premultiplyAlpha: true,
        opacity: 0.45
      },
      { transparent: true, depthWrite: false }
    )

    const colorBulletRim = new Color()
    colorMakers.fire(0, colorBulletRim, 0)
    colorBulletRim.multiply(basicMissileSettings.colorFireEnd)
    const colorBulletCenter = new Color()
    colorMakers.fire(0, colorBulletCenter, 0)
    colorBulletCenter.multiply(basicMissileSettings.colorFireStart)

    // colorBulletCenter.setRGB(10, 10, 0)

    const bullet = new Mesh(
      getFlareGeometry('fireBullet', colorBulletCenter, colorBulletRim),
      bulletMat
    )
    bullet.renderOrder = -100
    // bullet.scale.z = 2
    // bullet.position.z += 0.03
    bodyPrototype.add(bullet)

    applyBlendModeByIndicesToMesh(longFlames, 5, 6)
    for (const target of [shortFlames, bullet]) {
      applyBlendModeByIndicesToMesh(target, 4, 6)
    }
    return {
      particleRenderObjects: [longFlames, shortFlames, sparks, smoke],
      chargeUpWriters: [
        // new MissileParticleWriter(
        //   longFlames,
        //   missileParticlePathMakerLib.fireGather,
        //   40
        // )
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
          500
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
        // new MissileParticleWriter(
        //   longFlames,
        //   missileParticlePathMakerLib.fireExplosion,
        //   100
        // ),
        // new MissileParticleWriter(
        //   sparks,
        //   missileParticlePathMakerLib.sparkExplosion,
        //   100
        // ),
        // new MissileParticleWriter(
        //   smoke,
        //   missileParticlePathMakerLib.smokeExplosion,
        //   70
        // )
      ],
      shake: 0.4,
      missileBody: bodyPrototype,
      mainSoundID: 'SpellFireFlight',
      explosionSoundID: 'SpellFireImpact',
      blockingDuration: 1000,
      mainGatlingTag: 'missile',
      chargeGatlingTag: 'missileCharge'
    }
  },

  fireMissile() {
    const longFlames = getRibbonLayer('flamesLong')

    const shortFlames = getRibbonLayer('flamesShort')

    // activateBlendModeDiscovery(getMeshMaterial(longFlames))
    // activateBlendModeDiscovery(getMeshMaterial(shortFlames))
    // const data: { [K:string]: Color } = {
    //   start: basicMissileSettings.colorFireStart,
    //   end: basicMissileSettings.colorFireEnd,
    //   headStart: basicMissileSettings.colorFireHeadStart,
    //   headEnd: basicMissileSettings.colorFireHeadEnd
    // }
    // for(const cName of Object.keys(data)) {
    //   const color = data[cName]
    //   const cController = new NiceColorParameter('temp2-'+cName, cName, color, 'missiles')
    //   cController.listen(c => color.copy(c))
    // }

    const sparks = getRibbonLayer('sparks')

    const smoke = getPointLayer('smoke')
    smoke.renderOrder = -100

    const bodyPrototype = new Object3D()

    const bulletMat = new RGBAVertexColorMeshMaterial(
      {
        screenspaceMode: true,
        blendMode: 'screenAlpha',
        premultiplyAlpha: true,
        opacity: 0.45
      },
      { transparent: true, depthWrite: false }
    )

    const colorBulletRim = new Color()
    colorMakers.fire(0, colorBulletRim, 0)
    colorBulletRim.multiply(basicMissileSettings.colorFireEnd)
    const colorBulletCenter = new Color()
    colorMakers.fire(0, colorBulletCenter, 0)
    colorBulletCenter.multiply(basicMissileSettings.colorFireStart)

    // colorBulletCenter.setRGB(10, 10, 0)

    const bullet = new Mesh(
      getFlareGeometry('fireBullet', colorBulletCenter, colorBulletRim),
      bulletMat
    )
    bullet.renderOrder = -100
    // bullet.scale.z = 2
    // bullet.position.z += 0.03
    bodyPrototype.add(bullet)

    applyBlendModeByIndicesToMesh(longFlames, 5, 6)
    for (const target of [shortFlames, bullet]) {
      applyBlendModeByIndicesToMesh(target, 4, 6)
    }
    return {
      particleRenderObjects: [longFlames, shortFlames, sparks, smoke],
      chargeUpWriters: [
        new MissileParticleWriter(
          longFlames,
          missileParticlePathMakerLib.fireGather,
          40
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
          500
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
      shake: 0.4,
      missileBody: bodyPrototype,
      mainSoundID: 'SpellFireFlight',
      explosionSoundID: 'SpellFireImpact',
      blockingDuration: 1000,
      mainGatlingTag: 'missile',
      chargeGatlingTag: 'missileCharge'
    }
  },

  poisonMissile() {
    const longFlames = getRibbonLayer('poisonFlamesLong')
    const shortFlames = getRibbonLayer('poisonFlamesShort')
    const sparks = getRibbonLayer('sparks')
    const bodyPrototype = new Object3D()
    const bulletMat = new RGBAVertexColorMeshMaterial(
      {
        screenspaceMode: true,
        blendMode: 'screenAlpha',
        premultiplyAlpha: true,
        opacity: 0.45
      },
      { transparent: true, depthWrite: false }
    )
    const colorBulletRim = new Color()
    colorMakers.fire(0, colorBulletRim, 0)
    colorBulletRim.multiply(basicMissileSettings.colorPoisonFireEnd)
    const colorBulletCenter = new Color()
    colorMakers.fire(0, colorBulletCenter, 0)
    colorBulletCenter.multiply(basicMissileSettings.colorPoisonFireStart)

    // colorBulletCenter.setRGB(10, 10, 0)

    const bullet = new Mesh(
      getFlareGeometry('fireBullet', colorBulletCenter, colorBulletRim),
      bulletMat
    )
    bullet.renderOrder = -100
    // bullet.scale.z = 2
    // bullet.position.z += 0.03
    bodyPrototype.add(bullet)

    applyBlendModeByIndicesToMesh(longFlames, 5, 6)
    for (const target of [shortFlames, bullet]) {
      applyBlendModeByIndicesToMesh(target, 4, 6)
    }
    return {
      particleRenderObjects: [longFlames, shortFlames, sparks],
      chargeUpWriters: [
        new MissileParticleWriter(
          longFlames,
          missileParticlePathMakerLib.fireGather,
          40
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
          500
        ),
        new MissileParticleWriter(
          sparks,
          missileParticlePathMakerLib.sparksFloating,
          50
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
        )
      ],
      shake: 0.4,
      missileBody: bodyPrototype,
      mainSoundID: undefined,
      explosionSoundID: undefined,
      blockingDuration: 1000,
      mainGatlingTag: 'missile',
      chargeGatlingTag: 'missileCharge'
    }
  },

  magicMissile() {
    const longFlames = getRibbonLayer('magicFlamesLong')

    const shortFlames = getRibbonLayer('magicFlamesShort')

    const sparks = getRibbonLayer('sparks')

    const steam = getPointLayer('steam')
    steam.renderOrder = -100

    const bodyPrototype = new Object3D()

    const bulletMat = new RGBAVertexColorMeshMaterial(
      {
        screenspaceMode: true,
        blendMode: 'screenAlpha',
        premultiplyAlpha: true,
        opacity: 0.45
      },
      { transparent: true, depthWrite: false }
    )

    const colorBulletRim = new Color()
    colorMakers.fire(0, colorBulletRim, 0)
    colorBulletRim.multiply(basicMissileSettings.colorMagicFireStart)
    const colorBulletCenter = new Color()
    colorMakers.fire(0, colorBulletCenter, 0)
    colorBulletCenter.multiply(basicMissileSettings.colorMagicFireEnd)

    // colorBulletCenter.setRGB(10, 10, 0)

    const bullet = new Mesh(
      getFlareGeometry('magicBullet', colorBulletCenter, colorBulletRim),
      bulletMat
    )
    bullet.renderOrder = -100
    // bullet.scale.z = 2
    // bullet.position.z += 0.03
    bodyPrototype.add(bullet)

    applyBlendModeByIndicesToMesh(longFlames, 5, 6)
    for (const target of [longFlames, shortFlames, bullet]) {
      applyBlendModeByIndicesToMesh(target, 4, 6)
    }

    return {
      particleRenderObjects: [longFlames, shortFlames, sparks, steam],
      chargeUpWriters: [
        new MissileParticleWriter(
          longFlames,
          missileParticlePathMakerLib.fireGather,
          40
        )
      ],
      mainWriters: [
        new MissileParticleWriter(
          longFlames,
          missileParticlePathMakerLib.fireTrail,
          120
        ),
        new MissileParticleWriter(
          shortFlames,
          missileParticlePathMakerLib.fireHead,
          200
        ),
        new MissileParticleWriter(
          sparks,
          missileParticlePathMakerLib.sparksFloating,
          50
        ),
        new MissileParticleWriter(
          steam,
          missileParticlePathMakerLib.smokeFloating,
          70
        )
      ],
      explosionWriters: [
        new MissileParticleWriter(
          longFlames,
          missileParticlePathMakerLib.fireExplosion,
          120
        ),
        new MissileParticleWriter(
          sparks,
          missileParticlePathMakerLib.sparkExplosion,
          100
        ),
        new MissileParticleWriter(
          steam,
          missileParticlePathMakerLib.smokeExplosion,
          70
        )
      ],
      missileBody: bodyPrototype,
      shake: 0.4,
      mainSoundID: 'SpellMagicFlight',
      explosionSoundID: 'SpellMagicImpact',
      blockingDuration: 1000,
      mainGatlingTag: 'missile',
      chargeGatlingTag: 'missileCharge'
    }
  },

  coinMissile() {
    const longFlames = getRibbonLayer('coinFlamesLong')

    const shortFlames = getRibbonLayer('coinFlamesShort')

    const sparks = getRibbonLayer('sparks')

    const steam = getPointLayer('steam')
    steam.renderOrder = -100

    const bodyPrototype = new Object3D()

    const bulletMat = new RGBAVertexColorMeshMaterial(
      {
        screenspaceMode: true,
        blendMode: 'screenAlpha',
        premultiplyAlpha: true,
        opacity: 0.45
      },
      { transparent: true, depthWrite: false }
    )

    const colorBulletRim = new Color()
    colorMakers.fire(0, colorBulletRim, 0)
    colorBulletRim.multiply(basicMissileSettings.colorMagicFireStart)
    const colorBulletCenter = new Color()
    colorMakers.fire(0, colorBulletCenter, 0)
    colorBulletCenter.multiply(basicMissileSettings.colorMagicFireEnd)

    // colorBulletCenter.setRGB(10, 10, 0)

    const bullet = new Mesh(
      getFlareGeometry('magicBullet', colorBulletCenter, colorBulletRim),
      bulletMat
    )
    bullet.renderOrder = -100
    // bullet.scale.z = 2
    // bullet.position.z += 0.03
    bodyPrototype.add(bullet)

    applyBlendModeByIndicesToMesh(longFlames, 5, 6)
    for (const target of [longFlames, shortFlames, bullet]) {
      applyBlendModeByIndicesToMesh(target, 4, 6)
    }

    return {
      particleRenderObjects: [longFlames, shortFlames, sparks, steam],
      chargeUpWriters: [
        new MissileParticleWriter(
          longFlames,
          missileParticlePathMakerLib.fireGather,
          40
        )
      ],
      mainWriters: [
        new MissileParticleWriter(
          longFlames,
          missileParticlePathMakerLib.fireTrail,
          120
        ),
        new MissileParticleWriter(
          shortFlames,
          missileParticlePathMakerLib.fireHead,
          200
        ),
        new MissileParticleWriter(
          sparks,
          missileParticlePathMakerLib.sparksFloating,
          50
        ),
        new MissileParticleWriter(
          steam,
          missileParticlePathMakerLib.smokeFloating,
          70
        )
      ],
      explosionWriters: [
        new MissileParticleWriter(
          longFlames,
          missileParticlePathMakerLib.fireExplosion,
          120
        ),
        new MissileParticleWriter(
          sparks,
          missileParticlePathMakerLib.sparkExplosion,
          100
        ),
        new MissileParticleWriter(
          steam,
          missileParticlePathMakerLib.smokeExplosion,
          70
        )
      ],
      missileBody: bodyPrototype,
      shake: 0.4,
      mainSoundID: 'SpellMagicFlight',
      explosionSoundID: 'SpellMagicImpact',
      blockingDuration: 1000,
      mainGatlingTag: 'missile',
      chargeGatlingTag: 'missileCharge'
    }
  },

  bloodMissile() {
    const longFlames = getRibbonLayer('bloodFlamesLong')

    const shortFlames = getRibbonLayer('bloodFlamesShort')

    const sparks = getRibbonLayer('sparks')

    const steam = getPointLayer('steam')
    steam.renderOrder = -100

    const bodyPrototype = new Object3D()

    const bulletMat = new RGBAVertexColorMeshMaterial(
      {
        screenspaceMode: true,
        blendMode: 'screenAlpha',
        premultiplyAlpha: true,
        opacity: 0.45
      },
      { transparent: true, depthWrite: false }
    )

    const colorBulletRim = new Color()
    colorMakers.fire(0, colorBulletRim, 0)
    colorBulletRim.multiply(basicMissileSettings.colorMagicFireStart)
    const colorBulletCenter = new Color()
    colorMakers.fire(0, colorBulletCenter, 0)
    colorBulletCenter.multiply(basicMissileSettings.colorMagicFireEnd)

    const bullet = new Mesh(
      getFlareGeometry('magicBullet', colorBulletCenter, colorBulletRim),
      bulletMat
    )
    bullet.renderOrder = -100
    bodyPrototype.add(bullet)

    applyBlendModeByIndicesToMesh(longFlames, 5, 6)
    for (const target of [longFlames, shortFlames, bullet]) {
      applyBlendModeByIndicesToMesh(target, 4, 6)
    }

    return {
      particleRenderObjects: [longFlames, shortFlames, sparks, steam],
      chargeUpWriters: [
        new MissileParticleWriter(
          longFlames,
          missileParticlePathMakerLib.fireGather,
          40
        )
      ],
      mainWriters: [
        new MissileParticleWriter(
          longFlames,
          missileParticlePathMakerLib.fireTrail,
          120
        ),
        new MissileParticleWriter(
          shortFlames,
          missileParticlePathMakerLib.fireHead,
          200
        ),
        new MissileParticleWriter(
          sparks,
          missileParticlePathMakerLib.sparksFloating,
          50
        ),
        new MissileParticleWriter(
          steam,
          missileParticlePathMakerLib.smokeFloating,
          70
        )
      ],
      explosionWriters: [
        new MissileParticleWriter(
          longFlames,
          missileParticlePathMakerLib.fireExplosion,
          120
        ),
        new MissileParticleWriter(
          sparks,
          missileParticlePathMakerLib.sparkExplosion,
          100
        ),
        new MissileParticleWriter(
          steam,
          missileParticlePathMakerLib.smokeExplosion,
          70
        )
      ],
      missileBody: bodyPrototype,
      shake: 0.4,
      mainSoundID: 'SpellMagicFlight',
      explosionSoundID: 'SpellMagicImpact',
      blockingDuration: 1000,
      mainGatlingTag: 'missile',
      chargeGatlingTag: 'missileCharge'
    }
  },

  hexMissile() {
    const longFlames = getRibbonLayer('hexFlamesLong')

    const shortFlames = getRibbonLayer('hexFlamesShort')

    const sparks = getRibbonLayer('sparks')

    const steam = getPointLayer('steam')
    steam.renderOrder = -100

    const bodyPrototype = new Object3D()

    const bulletMat = new RGBAVertexColorMeshMaterial(
      {
        screenspaceMode: true,
        blendMode: 'screenAlpha',
        premultiplyAlpha: true,
        opacity: 0.45
      },
      { transparent: true, depthWrite: false }
    )

    const colorBulletRim = new Color()
    colorMakers.fire(0, colorBulletRim, 0)
    colorBulletRim.multiply(basicMissileSettings.colorHexFireStart)
    const colorBulletCenter = new Color()
    colorMakers.fire(0, colorBulletCenter, 0)
    colorBulletCenter.multiply(basicMissileSettings.colorHexFireEnd)

    const bullet = new Mesh(
      getFlareGeometry('magicBullet', colorBulletCenter, colorBulletRim),
      bulletMat
    )
    bullet.renderOrder = -100
    bodyPrototype.add(bullet)

    applyBlendModeByIndicesToMesh(longFlames, 5, 6)
    for (const target of [longFlames, shortFlames, bullet]) {
      applyBlendModeByIndicesToMesh(target, 4, 6)
    }

    return {
      particleRenderObjects: [longFlames, shortFlames, sparks, steam],
      chargeUpWriters: [
        new MissileParticleWriter(
          longFlames,
          missileParticlePathMakerLib.fireGather,
          40
        )
      ],
      mainWriters: [
        new MissileParticleWriter(
          longFlames,
          missileParticlePathMakerLib.fireTrail,
          120
        ),
        new MissileParticleWriter(
          shortFlames,
          missileParticlePathMakerLib.fireHead,
          200
        ),
        new MissileParticleWriter(
          sparks,
          missileParticlePathMakerLib.sparksFloating,
          50
        ),
        new MissileParticleWriter(
          steam,
          missileParticlePathMakerLib.smokeFloating,
          70
        )
      ],
      explosionWriters: [
        new MissileParticleWriter(
          longFlames,
          missileParticlePathMakerLib.fireExplosion,
          120
        ),
        new MissileParticleWriter(
          sparks,
          missileParticlePathMakerLib.sparkExplosion,
          100
        ),
        new MissileParticleWriter(
          steam,
          missileParticlePathMakerLib.smokeExplosion,
          70
        )
      ],
      missileBody: bodyPrototype,
      shake: 0.4,
      mainSoundID: 'SpellMagicFlight',
      explosionSoundID: 'SpellMagicImpact',
      blockingDuration: 1000,
      mainGatlingTag: 'missile',
      chargeGatlingTag: 'missileCharge'
    }
  },

  lifeTransferMissile() {
    const longFlames = getRibbonLayer('lifeTendrils')

    // activateBlendModeDiscovery(getMeshMaterial(longFlames))
    // const data: { [K:string]: Color } = {
    //   start: basicMissileSettings.colorLifePodStart,
    //   end: basicMissileSettings.colorLifePodEnd
    // }
    // for(const cName of Object.keys(data)) {
    //   const color = data[cName]
    //   const cController = new NiceColorParameter('temp-'+cName, cName, color, 'missiles')
    //   cController.listen(c => color.copy(c))
    // }

    applyBlendModeByIndicesToMesh(longFlames, 4, 6)

    return {
      particleRenderObjects: [longFlames],
      explosionWriters: [
        new MissileParticleWriter(
          longFlames,
          missileParticlePathMakerLib.fireGather,
          40
        )
      ],
      mainWriters: [
        new MissileParticleWriter(
          longFlames,
          missileParticlePathMakerLib.lifeTrail,
          30
        )
      ],
      distanceToDuration: (distance: number) => 500 + 1000 * distance,
      chargeUpWriters: [
        new MissileParticleWriter(
          longFlames,
          missileParticlePathMakerLib.lifeExplosion,
          100
        )
      ],
      mainSoundID: 'LifeStealFlight',
      explosionSoundID: 'LifeStealImpact',
      chargeUpDuration: 200,
      blockingDuration: 800,
      mainGatlingTag: 'heal',
      chargeGatlingTag: 'healCharge'
    }
  }
}
