import { Color, Vector2 } from 'three'

import { COLOR_BLACK } from '~/colors/colorLibrary'
import colorMakers from '~/factories/colorMakers'
import { QuadraticPointsParameters } from '~/meshes/Particles/QuadraticPoints'
import { QuadraticRibbonsMeshOptions } from '~/meshes/Particles/QuadraticRibbonsMesh'
import { getFastRandomNumber } from '~/utils/mathThree'

export const curatedRibbonMeshLayers = [
  'damageSplashLongSkinny',
  'damageSplashShortFat',
  'flamesLong',
  'flamesShort',
  'poisonFlamesLong',
  'poisonFlamesShort',
  'coinFlamesLong',
  'coinFlamesShort',
  'bloodFlamesLong',
  'bloodFlamesShort',
  'hexFlamesLong',
  'hexFlamesShort',
  'magicFlamesLong',
  'magicFlamesShort',
  'sparks',
  'goldenPortalSparks',
  'electricArcsLong',
  'electricArcsShort',
  'electricSparks',
  'flintSparks',
  'evaporatedMagic',
  'evaporatedMagicFast',
  'daggerSlashes',
  'lifeTendrils',
  'witherTendrils',
  'darkSparks',
  'armorArcsLong',
  'armorSparks',
  'uiSparks',
  'timerSparks',
  'bannerLightShafts',
  'simpleLines',
  'debugGradientLine'
  // 'arenaDamage'
] as const

export type CuratedRibbonMeshLayer = (typeof curatedRibbonMeshLayers)[number]
export const curatedPointLayer = [
  'dustPuffs',
  'smoke',
  'elementalSouls',
  'steam',
  'electricSmoke',
  'glowingDust',
  'fireflies',
  'timerSparks',
  'ropeSparks',
  'healingOrbs',
  'witherFumes',
  'pebbles',
  'flint'
  // 'arenaDamage'
] as const

export type CuratedPointLayer = (typeof curatedPointLayer)[number]

export const basicMissileSettings = {
  colorSmoke: new Color(0.13, 0.13, 0.13),
  smokeOpacity: 0.2,

  colorFireHeadStart: new Color(2, 1, 0.5),
  colorFireHeadEnd: new Color(1.2, 0.7, 0.2),
  colorDamageFlareStart: new Color(2 + 2, 1 + 2, 0.5 + 2),
  colorDamageFlareEnd: new Color(1.2 + 2, 0.7 + 2, 0.2 + 2),
  colorFireStart: new Color(6.2, 2.5, 2.8),
  colorFireEnd: new Color(1.9, -3.9, -2.3),

  /* Green Bundle with Purple/Pink Trails, specifically for Vile Vial */
  colorPoisonFireHeadStart: new Color(1.8, 7.7, 1.5),
  colorPoisonFireHeadEnd: new Color(-2.3, 2.4, -3.9),
  colorPoisonFireStart: new Color(4.7, 1.2, 5.7),
  colorPoisonFireEnd: new Color(5, 0.4, 6.1),

  /* Bright Yellow bundle to emulate coins, specifically for Overdraft */
  colorCoinFireHeadStart: new Color(-4.08, 5.83, -5.95),
  colorCoinFireHeadEnd: new Color(-0.29, 0.03, 2.07),
  colorCoinFireStart: new Color(8.08, 1.83, -5.95),
  colorCoinFireEnd: new Color(0.7, 4.14, 8.33),

  /* Deep Sanguine Red, specifically for Bloodletter's trigger */
  colorBloodFireHeadStart: new Color(4, 0.1, -0.1),
  colorBloodFireHeadEnd: new Color(8, 0, -0.2),
  colorBloodFireStart: new Color(4, 0.1, -0.1),
  colorBloodFireEnd: new Color(8, 0, -0.2),

  /* Pink Purple Hex, specifically for some hexbound cards */
  colorHexFireHeadStart: new Color(4.7, 1.2, 5.7),
  colorHexFireHeadEnd: new Color(4.7, 1.2, 5.7),
  colorHexFireStart: new Color(4.7, 1.2, 5.7),
  colorHexFireEnd: new Color(5, 0.4, 6.1),

  colorMagicFireHeadStart: new Color(-0.46, -1.02, 3.89),
  colorMagicFireHeadEnd: new Color(-0.29, 0.03, 2.07),
  colorMagicFireStart: new Color(-1.08, -3.83, 1.95),
  colorMagicFireEnd: new Color(0.7, 4.14, 8.33),
  colorWitherStart: new Color(-0.25, -0.25, -0.25),
  colorWitherEnd: new Color(15, 1.79, 24),
  colorWitherFumesStart: new Color(2.5, -2.9, 3.9),
  colorWitherFumesEnd: new Color(-13, -13, -13),
  colorLifePodStart: new Color(1, 1, 1),
  colorLifePodEnd: new Color(3.3, -1.2, 12.5),
  colorDarkSparksStart: new Color(3, -3.6, 4.6),
  colorDarkSparksEnd: new Color(-5.2, -5.2, -5.2),
  missileOpacity: 0.44
}

const basicElectricArcSettings = {
  colorSmoke: new Color(0.2, 0.2, 0.2),
  smokeOpacity: 0.35,
  colorElectricArcStart: new Color(9.7, 9.1, 9.5),
  colorElectricArcEnd: new Color(-2.8, -2.7, -3.2),
  zapperOpacity: 0.16
}
const basicArmorArcSettings = {
  colorSmoke: new Color(0.2, 0.2, 0.2),
  smokeOpacity: 0.35,
  colorArmorArcStart: new Color(9.5, 9.1, 9.7),
  colorArmorArcEnd: new Color(-0.95, -0.45, -0.55),
  zapperOpacity: 0.16
}

const basicBannerSettings = {
  colorLightShaftStart: new Color(1.56, 1.56, 1.56),
  colorLightShaftEnd: new Color(-0.86, -0.94, -0.84),
  lightShaftOpacity: 0.2
}

export const ribbonMeshSettingsLib: {
  [K in CuratedRibbonMeshLayer]: Partial<QuadraticRibbonsMeshOptions>
} = {
  debugGradientLine: {
    name: 'debugGradientLine',
    speed: 600,
    trianglesPerRibbon: 10,

    matOptions: {
      strokePathFraction: 1.1,
      relativeWidth: 0.02,
      quantizeVertsAlongTime: false,
      opacity: 1,
      color: new Color(1, 1, 1),
      colorEnd: new Color(0, 1, 1),
      useColorOverTime: false,
      useColorOverOpacity: false,
      shapeEase: 'debugArrow',
      blendMode: 'normalAlpha',
      timeEase: 'linear',
      progressLock: 0.5
    },
    geomOptions: {
      totalRibbons: 60,
      colorMaker: colorMakers.fullWhite
    }
  },
  flamesLong: {
    name: 'longFlames',
    speed: 2,
    trianglesPerRibbon: 12,
    matOptions: {
      strokePathFraction: 0.75,
      // mapTexture: 'brushStroke',
      relativeWidth: 0.05,
      distortionTexture: 'noise3Map',
      distortionStrength: 0.03,
      distortionScale: 2,
      quantizeVertsAlongTime: true,
      blendMode: 'screenAlpha',
      opacity: 0.41,
      premultiplyAlpha: true,
      taperRibbonOut: true,
      color: basicMissileSettings.colorFireStart,
      colorEnd: basicMissileSettings.colorFireEnd,
      useColorOverTime: true,
      useColorOverOpacity: true
    },
    geomOptions: {
      colorMaker: colorMakers.fire
    }
  },
  flamesShort: {
    name: 'shortFlames',
    speed: 10,
    trianglesPerRibbon: 8,
    matOptions: {
      // mapTexture: 'brushStroke',
      strokePathFraction: 1,
      relativeWidth: 0.03,
      // distortionTexture: 'noise3Map',
      // distortionStrength: 0.03,
      // distortionScale: 2,
      quantizeVertsAlongTime: true,
      blendMode: 'screenAlpha',
      opacity: 0.5,
      premultiplyAlpha: true,
      taperRibbonOut: true,
      // colorMaker: sparkColorMaker,
      color: basicMissileSettings.colorFireHeadStart,
      colorEnd: basicMissileSettings.colorFireHeadEnd,
      useColorOverTime: true,
      useColorOverOpacity: true
    }
  },

  poisonFlamesLong: {
    name: 'poisonLongFlames',
    speed: 2,
    trianglesPerRibbon: 12,
    matOptions: {
      strokePathFraction: 0.75,
      // mapTexture: 'brushStroke',
      relativeWidth: 0.05,
      distortionTexture: 'noise3Map',
      distortionStrength: 0.03,
      distortionScale: 2,
      quantizeVertsAlongTime: true,
      blendMode: 'screenAlpha',
      opacity: 0.41,
      premultiplyAlpha: true,
      taperRibbonOut: true,
      color: basicMissileSettings.colorPoisonFireStart,
      colorEnd: basicMissileSettings.colorPoisonFireEnd,
      useColorOverTime: true,
      useColorOverOpacity: true
    },
    geomOptions: {
      colorMaker: colorMakers.fire
    }
  },
  poisonFlamesShort: {
    name: 'poisonShortFlames',
    speed: 10,
    trianglesPerRibbon: 8,
    matOptions: {
      // mapTexture: 'brushStroke',
      strokePathFraction: 1,
      relativeWidth: 0.03,
      // distortionTexture: 'noise3Map',
      // distortionStrength: 0.03,
      // distortionScale: 2,
      quantizeVertsAlongTime: true,
      blendMode: 'screenAlpha',
      opacity: 0.5,
      premultiplyAlpha: true,
      taperRibbonOut: true,
      // colorMaker: sparkColorMaker,
      color: basicMissileSettings.colorPoisonFireHeadStart,
      colorEnd: basicMissileSettings.colorPoisonFireHeadEnd,
      useColorOverTime: true,
      useColorOverOpacity: true
    }
  },

  coinFlamesLong: {
    name: 'coinLongFlames',
    speed: 2,
    trianglesPerRibbon: 12,
    matOptions: {
      strokePathFraction: 0.75,
      // mapTexture: 'brushStroke',
      relativeWidth: 0.05,
      distortionTexture: 'noise3Map',
      distortionStrength: 0.03,
      distortionScale: 2,
      quantizeVertsAlongTime: true,
      blendMode: 'screenAlpha',
      opacity: 0.41,
      premultiplyAlpha: true,
      taperRibbonOut: true,
      color: basicMissileSettings.colorCoinFireStart,
      colorEnd: basicMissileSettings.colorCoinFireEnd,
      useColorOverTime: true,
      useColorOverOpacity: true
    },
    geomOptions: {
      colorMaker: colorMakers.fire
    }
  },
  coinFlamesShort: {
    name: 'coinShortFlames',
    speed: 10,
    trianglesPerRibbon: 8,
    matOptions: {
      // mapTexture: 'brushStroke',
      strokePathFraction: 1,
      relativeWidth: 0.03,
      // distortionTexture: 'noise3Map',
      // distortionStrength: 0.03,
      // distortionScale: 2,
      quantizeVertsAlongTime: true,
      blendMode: 'screenAlpha',
      opacity: 0.5,
      premultiplyAlpha: true,
      taperRibbonOut: true,
      // colorMaker: sparkColorMaker,
      color: basicMissileSettings.colorCoinFireHeadStart,
      colorEnd: basicMissileSettings.colorCoinFireHeadEnd,
      useColorOverTime: true,
      useColorOverOpacity: true
    }
  },

  bloodFlamesLong: {
    name: 'bloodLongFlames',
    speed: 2,
    trianglesPerRibbon: 12,
    matOptions: {
      strokePathFraction: 0.75,
      relativeWidth: 0.05,
      distortionTexture: 'noise3Map',
      distortionStrength: 0.03,
      distortionScale: 2,
      quantizeVertsAlongTime: true,
      blendMode: 'screenAlpha',
      opacity: 0.41,
      premultiplyAlpha: true,
      taperRibbonOut: true,
      color: basicMissileSettings.colorBloodFireStart,
      colorEnd: basicMissileSettings.colorBloodFireEnd,
      useColorOverTime: true,
      useColorOverOpacity: true
    },
    geomOptions: {
      colorMaker: colorMakers.fire
    }
  },
  bloodFlamesShort: {
    name: 'bloodShortFlames',
    speed: 10,
    trianglesPerRibbon: 8,
    matOptions: {
      strokePathFraction: 1,
      relativeWidth: 0.03,
      quantizeVertsAlongTime: true,
      blendMode: 'screenAlpha',
      opacity: 0.5,
      premultiplyAlpha: true,
      taperRibbonOut: true,
      color: basicMissileSettings.colorBloodFireHeadStart,
      colorEnd: basicMissileSettings.colorBloodFireHeadEnd,
      useColorOverTime: true,
      useColorOverOpacity: true
    }
  },

  hexFlamesLong: {
    name: 'hexLongFlames',
    speed: 2,
    trianglesPerRibbon: 12,
    matOptions: {
      strokePathFraction: 0.75,
      relativeWidth: 0.03,
      distortionTexture: 'noise3Map',
      distortionStrength: 0.03,
      distortionScale: 4,
      quantizeVertsAlongTime: true,
      blendMode: 'screenAlpha',
      opacity: 0.41,
      premultiplyAlpha: true,
      taperRibbonOut: true,
      color: basicMissileSettings.colorHexFireStart,
      colorEnd: basicMissileSettings.colorHexFireEnd,
      useColorOverTime: true,
      useColorOverOpacity: true
    },
    geomOptions: {
      colorMaker: colorMakers.fire
    }
  },
  hexFlamesShort: {
    name: 'hexShortFlames',
    speed: 10,
    trianglesPerRibbon: 8,
    matOptions: {
      strokePathFraction: 1,
      relativeWidth: 0.03,
      quantizeVertsAlongTime: true,
      blendMode: 'screenAlpha',
      opacity: 0.5,
      premultiplyAlpha: true,
      taperRibbonOut: true,
      color: basicMissileSettings.colorHexFireHeadStart,
      colorEnd: basicMissileSettings.colorHexFireHeadEnd,
      useColorOverTime: true,
      useColorOverOpacity: true
    }
  },

  damageSplashLongSkinny: {
    name: 'damageSplashLongSkinny',
    speed: 0.75,
    trianglesPerRibbon: 4,
    matOptions: {
      // mapTexture: 'brushStroke',
      strokePathFraction: 0.75,
      relativeWidth: 0.005,
      // distortionTexture: 'noise3Map',
      // distortionStrength: 0.03,
      // distortionScale: 2,
      quantizeVertsAlongTime: false,
      blendMode: 'screenAlpha',
      opacity: 0.5,
      premultiplyAlpha: true,
      timeEase: 'invQuad',
      // shapeEase: 'sine',
      shapeEase: 'fullOn',
      // taperRibbonOut: true,
      // colorMaker: sparkColorMaker,
      color: basicMissileSettings.colorFireHeadStart,
      colorEnd: COLOR_BLACK,
      useColorOverTime: true,
      useColorOverOpacity: true,
      depthTest: false
    }
  },
  damageSplashShortFat: {
    name: 'damageSplashShortFat',
    speed: 2,
    trianglesPerRibbon: 8,
    matOptions: {
      // mapTexture: 'brushStroke',
      strokePathFraction: 1,
      relativeWidth: 0.075,
      // distortionTexture: 'noise3Map',
      // distortionStrength: 0.03,
      // distortionScale: 2,
      quantizeVertsAlongTime: true,
      blendMode: 'screenAlpha',
      opacity: 0.5,
      premultiplyAlpha: true,
      taperRibbonOut: true,
      // colorMaker: sparkColorMaker,
      color: basicMissileSettings.colorDamageFlareStart,
      colorEnd: basicMissileSettings.colorDamageFlareEnd,
      useColorOverTime: true,
      useColorOverOpacity: true,
      useTimeRewind: true,
      // ease: 'biasedSine',
      shapeEase: 'invQuad',
      timeEase: 'invQuad',
      // sineWaveScaleStrength: new Vector2(16, 0.007),
      depthTest: false
    }
  },
  magicFlamesLong: {
    name: 'magicFlamesLong',
    speed: 2,
    trianglesPerRibbon: 12,
    matOptions: {
      // mapTexture: 'brushStroke',
      strokePathFraction: 0.75,
      relativeWidth: 0.03,
      distortionTexture: 'noise3Map',
      distortionStrength: 0.03,
      distortionScale: 2,
      quantizeVertsAlongTime: true,
      premultiplyAlpha: true,
      blendMode: 'screenAlpha',
      opacity: 0.41,
      taperRibbonOut: true,
      color: basicMissileSettings.colorMagicFireStart,
      colorEnd: basicMissileSettings.colorMagicFireEnd,
      useColorOverTime: true,
      useColorOverOpacity: true
    },
    geomOptions: {
      colorMaker: colorMakers.fire
    }
  },
  magicFlamesShort: {
    name: 'magicFlamesShort',
    speed: 10,
    trianglesPerRibbon: 12,
    matOptions: {
      // mapTexture: 'brushStroke',
      strokePathFraction: 1,
      relativeWidth: 0.02,
      // distortionTexture: 'noise3Map',
      // distortionStrength: 0.03,
      // distortionScale: 2,
      quantizeVertsAlongTime: true,
      premultiplyAlpha: true,
      blendMode: 'screenAlpha',
      opacity: 0.5,
      taperRibbonOut: true,
      color: basicMissileSettings.colorMagicFireHeadStart,
      colorEnd: basicMissileSettings.colorMagicFireHeadEnd,
      useColorOverTime: true,
      useColorOverOpacity: true
    },
    geomOptions: {
      colorMaker: colorMakers.fire
    }
  },
  sparks: {
    name: 'sparks',
    speed: 0.75,
    trianglesPerRibbon: 2,
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
  },
  evaporatedMagic: {
    name: 'evaporatedMagic',
    speed: 0.75,
    trianglesPerRibbon: 4,
    matOptions: {
      strokePathFraction: 0.025,
      relativeWidth: 0.001,
      distortionTexture: 'noise3Map',
      distortionScale: 0.5,
      distortionStrength: 0.1,
      shapeEase: 'sine',
      taperRibbonOut: true,
      opacity: 1
    },
    geomOptions: {
      colorMaker: colorMakers.spark
    }
  },
  evaporatedMagicFast: {
    name: 'evaporatedMagicFast',
    speed: 1.5,
    trianglesPerRibbon: 4,
    matOptions: {
      strokePathFraction: 0.025,
      relativeWidth: 0.001,
      distortionTexture: 'noise3Map',
      distortionScale: 0.75,
      distortionStrength: 0.1,
      shapeEase: 'sqrdSine',
      distortionTaper: 'in',
      taperRibbonOut: true,
      opacity: 1
    },
    geomOptions: {
      colorMaker: colorMakers.spark
    }
  },
  goldenPortalSparks: {
    name: 'goldenPortalSparks',
    speed: 1.25,
    trianglesPerRibbon: 2,
    matOptions: {
      strokePathFraction: 0.025,
      relativeWidth: 0.002,
      distortionTexture: 'noise3Map',
      distortionScale: 0.5,
      distortionStrength: 0.1,
      shapeEase: 'sine',
      opacity: 1,
      taperRibbonOut: true,
      distortionTaper: 'in'
    },
    geomOptions: {
      colorMaker: colorMakers.spark
    }
  },
  electricArcsLong: {
    name: 'electricArcsLong',
    speed: 6,
    trianglesPerRibbon: 48,
    matOptions: {
      // mapTexture: 'brushStroke',
      strokePathFraction: 1.0,
      relativeWidth: 0.02,
      distortionTexture: 'noise3Map',
      distortionStrength: 0.1,
      distortionScale: 2,
      quantizeVertsAlongTime: true,
      blendMode: 'customAddAlpha',
      opacity: basicElectricArcSettings.zapperOpacity,
      taperRibbonOut: false,
      color: basicElectricArcSettings.colorElectricArcStart,
      colorEnd: basicElectricArcSettings.colorElectricArcEnd,
      useColorOverTime: false,
      useColorOverOpacity: true,
      distortionTaper: 'inout'
    },
    geomOptions: {
      colorMaker: colorMakers.fire
    }
  },
  simpleLines: {
    name: 'simpleLines',
    speed: 0.2,
    trianglesPerRibbon: 16,
    matOptions: {
      // mapTexture: 'brushStroke',
      shapeEase: 'sine',
      strokePathFraction: 1.0,
      relativeWidth: 0.02,
      quantizeVertsAlongTime: false,
      blendMode: 'customAddAlpha',
      opacity: basicElectricArcSettings.zapperOpacity,
      taperRibbonOut: false,
      color: basicElectricArcSettings.colorElectricArcStart,
      colorEnd: basicElectricArcSettings.colorElectricArcEnd,
      useColorOverTime: false,
      useColorOverOpacity: true,
      distortionTaper: 'inout'
    },
    geomOptions: {
      colorMaker: colorMakers.fire
    }
  },
  electricArcsShort: {
    name: 'electricArcsShort',
    speed: 6,
    trianglesPerRibbon: 12,
    matOptions: {
      // mapTexture: 'brushStroke',
      strokePathFraction: 1.0,
      relativeWidth: 0.01,
      distortionTexture: 'noise3Map',
      distortionStrength: 0.05,
      distortionScale: 3,
      quantizeVertsAlongTime: true,
      blendMode: 'customAddAlpha',
      opacity: basicElectricArcSettings.zapperOpacity,
      taperRibbonOut: false,
      color: basicElectricArcSettings.colorElectricArcStart,
      colorEnd: basicElectricArcSettings.colorElectricArcEnd,
      useColorOverTime: false,
      useColorOverOpacity: true,
      distortionTaper: 'inout'
    },
    geomOptions: {
      colorMaker: colorMakers.fire
    }
  },
  electricSparks: {
    name: 'electricSparks',
    speed: 4,
    trianglesPerRibbon: 2,
    matOptions: {
      strokePathFraction: 0.05,
      relativeWidth: 0.002,
      shapeEase: 'sine',
      opacity: 2
    },
    geomOptions: {
      colorMaker: colorMakers.spark
    }
  },
  flintSparks: {
    name: 'electricSparks',
    speed: 6,
    trianglesPerRibbon: 2,
    matOptions: {
      strokePathFraction: 0.25,
      relativeWidth: 0.001,
      shapeEase: 'sine',
      opacity: 2
    },
    geomOptions: {
      colorMaker: colorMakers.spark
    }
  },
  daggerSlashes: {
    name: 'daggerSlashes',
    // mapTexture: 'brushStroke',
    speed: 6,
    trianglesPerRibbon: 12,
    matOptions: {
      strokePathFraction: 0.75,
      relativeWidth: 0.025,
      // distortionTexture: 'noise3Map',
      // distortionStrength: 0.03,
      // distortionScale: 2,
      quantizeVertsAlongTime: true,
      premultiplyAlpha: true,
      blendMode: 'screenAlpha',
      opacity: 0.8,
      taperRibbonOut: true,
      color: basicMissileSettings.colorWitherStart,
      colorEnd: basicMissileSettings.colorWitherEnd,
      // useColorOverTime: true,
      useColorOverOpacity: true,
      shapeEase: 'sine'
    },
    geomOptions: {
      colorMaker: colorMakers.fire
    }
  },
  lifeTendrils: {
    name: 'lifeTendrils',
    speed: 1.5,
    trianglesPerRibbon: 16,
    matOptions: {
      // mapTexture: 'brushStroke',
      strokePathFraction: 0.75,
      relativeWidth: 0.03,
      distortionTexture: 'noise3Map',
      distortionStrength: 0.03,
      distortionScale: 1,
      quantizeVertsAlongTime: true,
      blendMode: 'screenAlpha',
      opacity: 0.5,
      taperRibbonOut: true,
      color: basicMissileSettings.colorLifePodStart,
      colorEnd: basicMissileSettings.colorLifePodEnd,
      useColorOverTime: true,
      useColorOverOpacity: true,
      shapeEase: 'sine'
    },
    geomOptions: {
      colorMaker: colorMakers.fire
    }
  },
  witherTendrils: {
    name: 'witherTendrils',
    speed: 2,
    trianglesPerRibbon: 36,
    matOptions: {
      // mapTexture: 'brushStroke',
      strokePathFraction: 0.95,
      relativeWidth: 0.015,
      distortionTexture: 'noise3Map',
      distortionStrength: 0.025,
      distortionScale: 4,
      quantizeVertsAlongTime: true,
      premultiplyAlpha: true,
      blendMode: 'screenAlpha',
      opacity: 0.8,
      taperRibbonOut: true,
      color: basicMissileSettings.colorWitherStart,
      colorEnd: basicMissileSettings.colorWitherEnd,
      // useColorOverTime: true,
      useColorOverOpacity: true,
      shapeEase: 'sine',
      sineWaveScaleStrength: new Vector2(16, 0.007),
      useTimeRewind: true
    },
    geomOptions: {
      colorMaker: colorMakers.fire
    }
  },
  darkSparks: {
    name: 'darkSparks',
    speed: 0.75,
    trianglesPerRibbon: 2,
    matOptions: {
      color: basicMissileSettings.colorDarkSparksStart,
      colorEnd: basicMissileSettings.colorDarkSparksEnd,
      useColorOverOpacity: false,
      useColorOverTime: true,
      premultiplyAlpha: true,
      strokePathFraction: 0.05,
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
  },
  armorArcsLong: {
    name: 'armorArcsLong',
    speed: 4,
    trianglesPerRibbon: 48,
    matOptions: {
      // mapTexture: 'brushStroke',
      strokePathFraction: 1.0,
      relativeWidth: 0.01,
      distortionTexture: 'noise3Map',
      distortionStrength: 0.05,
      distortionScale: 3,
      quantizeVertsAlongTime: true,
      blendMode: 'customAddAlpha',
      opacity: basicArmorArcSettings.zapperOpacity,
      taperRibbonOut: false,
      color: basicArmorArcSettings.colorArmorArcStart,
      colorEnd: basicArmorArcSettings.colorArmorArcEnd,
      useColorOverTime: false,
      useColorOverOpacity: true,
      distortionTaper: 'inout'
    },
    geomOptions: {
      colorMaker: colorMakers.armorArc
    }
  },
  armorSparks: {
    name: 'armorSparks',
    speed: 1,
    trianglesPerRibbon: 2,
    matOptions: {
      strokePathFraction: 0.04,
      relativeWidth: 0.003,
      distortionTexture: 'noise3Map',
      blendMode: 'customAddAlpha',
      distortionScale: 0.5,
      distortionStrength: 0.1,
      // ease: 'sine',
      color: basicArmorArcSettings.colorArmorArcStart,
      colorEnd: basicArmorArcSettings.colorArmorArcEnd,
      useColorOverTime: false,
      useColorOverOpacity: true,
      opacity: basicArmorArcSettings.zapperOpacity
    },
    geomOptions: {
      colorMaker: colorMakers.armorArc
    }
  },
  uiSparks: {
    name: 'uiSparks',
    speed: 0.6,
    trianglesPerRibbon: 2,
    matOptions: {
      strokePathFraction: 0.05,
      relativeWidth: 0.0055,
      uiScaleRelativeWidth: true,
      distortionTexture: 'noise3Map',
      blendMode: 'customAddAlpha',
      distortionScale: 0.75,
      distortionStrength: 0.15,
      // ease: 'sine',
      color: basicArmorArcSettings.colorArmorArcStart,
      colorEnd: basicArmorArcSettings.colorArmorArcEnd,
      useColorOverTime: false,
      useColorOverOpacity: true,
      opacity: basicArmorArcSettings.zapperOpacity,
      distortionTaper: 'in',
      taperRibbonOut: true,
      use2D: true
    },
    geomOptions: {
      colorMaker: colorMakers.spark
    }
  },
  timerSparks: {
    name: 'timerSparks',
    speed: 2.5,
    trianglesPerRibbon: 2,
    matOptions: {
      strokePathFraction: 0.27,
      relativeWidth: 0.005,
      uiScaleRelativeWidth: true,
      distortionTexture: 'noise3Map',
      blendMode: 'customAddAlpha',
      distortionScale: 0.5 / 600,
      distortionStrength: 0.1 * 1500,
      // ease: 'sine',
      color: basicArmorArcSettings.colorArmorArcStart,
      colorEnd: basicArmorArcSettings.colorArmorArcEnd,
      useColorOverTime: false,
      useColorOverOpacity: true,
      opacity: basicArmorArcSettings.zapperOpacity,
      distortionTaper: 'in',
      taperRibbonOut: true,
      use2D: true
    },
    geomOptions: {
      colorMaker: colorMakers.spark
    }
  },
  bannerLightShafts: {
    name: 'bannerLightShafts',
    speed: 1.6,
    trianglesPerRibbon: 6,
    matOptions: {
      // mapTexture: 'brushStroke',
      strokePathFraction: 1.15,
      relativeWidth: 0.015,
      // distortionTexture: 'noise3Map',
      // distortionStrength: 0.025,
      // distortionScale: 4,
      quantizeVertsAlongTime: false,
      premultiplyAlpha: true,
      blendMode: 'customAddAlpha',
      opacity: basicBannerSettings.lightShaftOpacity,
      taperRibbonOut: false,
      color: basicBannerSettings.colorLightShaftStart,
      colorEnd: basicBannerSettings.colorLightShaftEnd,
      useColorOverTime: true,
      // useColorOverOpacity: true,
      shapeEase: 'fullOn',
      // sineWaveScaleStrength: new Vector2(16, 0.007),
      useTimeRewind: true,
      progressLock: 0.4
    },
    geomOptions: {
      colorMaker: colorMakers.fire
    }
  }
}

export const illuminatedSmokeColorTop = new Color()
export const illuminatedSmokeColorBottom = new Color()
export const pointSettingsLib: {
  [K in CuratedPointLayer]: Partial<QuadraticPointsParameters>
} = {
  steam: {
    name: 'steam',
    speed: 0.75,
    matOptions: {
      colorTexture: 'smoke',
      distortionTexture: 'noise3Map',
      distortionScale: 1.4,
      distortionStrength: 0.0125,
      opacity: 0.1,
      blendMode: 'normalAlpha',
      // premultiplyAlpha: true,
      dissipate: true,
      colorLightTop: illuminatedSmokeColorTop,
      colorLightBottom: illuminatedSmokeColorBottom
    },
    geomOptions: {
      sizeMin: 40,
      sizeMax: 70,
      colorMaker: (i, color) => {
        const b = Math.sin(i) * 0.1 + 0.9
        color.setRGB(b, b, b)
      }
    }
  },
  smoke: {
    name: 'smoke',
    speed: 0.5,
    matOptions: {
      colorTexture: 'smoke',
      distortionTexture: 'noise3Map',
      distortionScale: 1.4,
      distortionStrength: 0.0125,
      opacity: 0.15,
      blendMode: 'normalAlpha',
      // premultiplyAlpha: true,
      dissipate: true,
      colorLightTop: illuminatedSmokeColorTop,
      colorLightBottom: illuminatedSmokeColorBottom
    },
    geomOptions: {
      sizeMin: 50,
      sizeMax: 90,
      colorMaker: (i, color) => {
        const b = Math.sin(i) * 0.1 + 0.25
        color.setRGB(b, b, b)
      }
    }
  },
  elementalSouls: {
    name: 'elementalSouls',
    speed: 0.5,
    matOptions: {
      colorTexture: 'particle',
      distortionTexture: 'noise3Map',
      distortionScale: 0.8,
      distortionStrength: 0.00625,
      distortionTaper: true,
      opacity: 0.3,
      blendMode: 'customAddAlpha',
      // premultiplyAlpha: true,
      dissipate: true,
      easeSize: true,
      easeOpacity: true
    },
    geomOptions: {
      sizeMin: 11 * 1.5,
      sizeMax: 17 * 1.5,
      colorMaker: (i, color) => {
        color.setHSL(getFastRandomNumber(), 0.9, 0.5).multiplyScalar(2.5)
      },
      jitColorMaker: true
    }
  },
  dustPuffs: {
    name: 'dustPuffs',
    speed: 1,
    matOptions: {
      colorTexture: 'smoke',
      // distortionTexture: 'noise3Map',
      // distortionScale: 4,
      // distortionStrength: 0.005,
      // distortionTaper: true,
      opacity: 0.5,
      blendMode: 'normalAlpha',
      premultiplyAlpha: false,
      dissipate: true,
      easeSize: true,
      easeOpacity: true,
      colorLightTop: illuminatedSmokeColorTop,
      colorLightBottom: illuminatedSmokeColorBottom
    },
    geomOptions: {
      sizeMin: 50,
      sizeMax: 90,
      colorMaker: (i, color) => {
        const b = Math.sin(i) * 0.1 + 0.9
        color.setRGB(b, b, b)
      }
    }
  },
  pebbles: {
    name: 'pebbles',
    speed: 4,
    matOptions: {
      colorTexture: 'smoke',
      // distortionTexture: 'noise3Map',
      // distortionScale: 4,
      // distortionStrength: 0.005,
      // distortionTaper: true,
      opacity: 1,
      alphaTest: 0.5,
      blendMode: 'normal',
      premultiplyAlpha: false,
      dissipate: true,
      easeSize: true,
      easeOpacity: false,
      colorLightTop: illuminatedSmokeColorTop,
      colorLightBottom: illuminatedSmokeColorBottom
    },
    geomOptions: {
      sizeMin: 3,
      sizeMax: 10,
      colorMaker: (i, color) => {
        const b = Math.sin(i) * 0.1 + 0.5
        color.setRGB(b, b, b)
      }
    }
  },
  flint: {
    name: 'flint',
    speed: 4,
    matOptions: {
      colorTexture: 'smoke',
      // distortionTexture: 'noise3Map',
      // distortionScale: 4,
      // distortionStrength: 0.005,
      // distortionTaper: true,
      opacity: 1,
      alphaTest: 0.5,
      blendMode: 'normal',
      premultiplyAlpha: false,
      dissipate: true,
      easeSize: true,
      easeOpacity: false,
      colorLightTop: illuminatedSmokeColorTop,
      colorLightBottom: illuminatedSmokeColorBottom
    },
    geomOptions: {
      sizeMin: 3,
      sizeMax: 10,
      colorMaker: (i, color) => {
        const b = Math.sin(i) * 0.1 + 0.25
        color.setRGB(b, b, b)
      }
    }
  },
  electricSmoke: {
    name: 'electricSmoke',
    speed: 0.75,
    matOptions: {
      colorTexture: 'smoke',
      distortionTexture: 'noise3Map',
      distortionScale: 1.4,
      distortionStrength: 0.0125,
      opacity: 0.1,
      blendMode: 'normalAlpha',
      // premultiplyAlpha: true,
      dissipate: true,
      colorLightTop: illuminatedSmokeColorTop,
      colorLightBottom: illuminatedSmokeColorBottom
    },
    geomOptions: {
      sizeMin: 60,
      sizeMax: 90,
      colorMaker: (i, color) => {
        const b = Math.sin(i) * 0.1 + 0.3
        color.setRGB(b, b, b)
      }
    }
  },
  glowingDust: {
    name: 'glowingDust',
    speed: 3,
    matOptions: {
      colorTexture: 'particle',
      // distortionTexture: 'noise3Map',
      // distortionScale: 0.4,
      // distortionStrength: 0.0125,
      opacity: 1.5,
      blendMode: 'screenAlpha',
      // premultiplyAlpha: true,
      dissipate: true,
      colorLightTop: illuminatedSmokeColorTop,
      colorLightBottom: illuminatedSmokeColorBottom
    },
    geomOptions: {
      sizeMin: 3,
      sizeMax: 5,
      colorMaker: (i, color) => {
        const b = Math.sin(i) * 0.1 + 0.3
        color.setRGB(b, b, b)
      }
    }
  },
  timerSparks: {
    name: 'timerSparks',
    speed: 3,
    matOptions: {
      colorTexture: 'particle',
      distortionTexture: 'noise3Map',
      distortionScale: 0.04,
      distortionStrength: 0.00125,
      opacity: 1.5,
      blendMode: 'customAddAlpha',
      // premultiplyAlpha: true,
      dissipate: true,
      perspectiveScale: false,
      useUiScale: true,
      use2D: true
      // colorLightTop: illuminatedSmokeColorTop,
      // colorLightBottom: illuminatedSmokeColorBottom
    },
    geomOptions: {
      sizeMin: 6,
      sizeMax: 12,
      colorMaker: (i, color) => {
        const b = Math.sin(i) * 0.8 + 0.6
        color.setRGB(b, b, b)
      }
    }
  },
  ropeSparks: {
    name: 'ropeSparks',
    speed: 3,
    matOptions: {
      colorTexture: 'particle',
      distortionTexture: 'noise3Map',
      distortionScale: 0.004,
      distortionStrength: 0.0005,
      opacity: 1.5,
      blendMode: 'customAddAlpha',
      // premultiplyAlpha: true,
      dissipate: true,
      perspectiveScale: true
      // colorLightTop: illuminatedSmokeColorTop,
      // colorLightBottom: illuminatedSmokeColorBottom
    },
    geomOptions: {
      sizeMin: 4,
      sizeMax: 8,
      colorMaker: (i, color) => {
        const b = Math.sin(i) * 0.8 + 0.6
        color.setRGB(b, b * 0.6, b * 0.1)
      }
    }
  },
  fireflies: {
    name: 'fireflies',
    speed: 0.4,
    matOptions: {
      colorTexture: 'particle',
      distortionTexture: 'noise3Map',
      distortionScale: 0.6,
      distortionStrength: 0.00325,
      distortionTaper: false,
      opacity: 1.5,
      blendMode: 'screenAlpha',
      // premultiplyAlpha: true,
      dissipate: true,
      colorLightTop: illuminatedSmokeColorTop,
      colorLightBottom: illuminatedSmokeColorBottom
    },
    geomOptions: {
      sizeMin: 3,
      sizeMax: 8,
      colorMaker: (i, color) => {
        const b = (Math.sin(i) * 0.1 + 0.2) * 3
        color.setRGB(b, b + 0.125, b)
      }
    }
  },
  healingOrbs: {
    name: 'healingOrbs',
    speed: 1,
    matOptions: {
      colorTexture: 'particle2',
      // distortionTexture: 'noise3Map',
      // distortionScale: 0.4,
      // distortionStrength: 0.0125,
      opacity: 5,
      blendMode: 'screenAlpha',
      premultiplyAlpha: true,
      dissipate: true,
      colorLightTop: illuminatedSmokeColorTop,
      colorLightBottom: illuminatedSmokeColorBottom
    },
    geomOptions: {
      sizeMin: 4,
      sizeMax: 10,

      colorMaker: (i, color) => {
        const ratio = i / 20
        const r = Math.sin(ratio * Math.PI) * 0.2 + 0.4
        const g = Math.sin((ratio + 0.33) * Math.PI) * 0.2 + 0.35
        const b = Math.sin((ratio + 0.66) * Math.PI) * 0.2 + 0.3
        color.setRGB(r, g, b)
      }
    }
  },
  witherFumes: {
    name: 'witherFumes',
    speed: 2,
    matOptions: {
      colorTexture: 'fireSpritesheet',
      spriteSheetSegments: 8,
      spriteSheetSpeed: 0.125,
      // distortionTexture: 'noise3Map',
      // distortionScale: 0.4,
      // distortionStrength: 0.0125,
      opacity: 1,
      flipX: true,
      alphaFromTexelRed: true,
      blendMode: 'customAddAlpha',
      premultiplyAlpha: true,
      dissipate: false,
      easeOpacity: true,
      colorLightTop: basicMissileSettings.colorWitherFumesStart,
      colorLightBottom: basicMissileSettings.colorWitherFumesEnd
    },
    geomOptions: {
      sizeMin: 150,
      sizeMax: 220,
      colorMaker: (i, color) => {
        const ratio = i / 20
        const r = Math.sin(ratio * Math.PI) * 0.2 + 0.8
        const g = Math.sin((ratio + 0.33) * Math.PI) * 0.2 + 0.25
        const b = Math.sin((ratio + 0.66) * Math.PI) * 0.2 + 0.7
        color.setRGB(r, g, b)
      }
    }
  }
}
