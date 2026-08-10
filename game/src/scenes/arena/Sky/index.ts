import { lerp, wrap } from '@opensky/shared/utils/math'
import {
  Color,
  LinearFilter,
  Object3D,
  Scene,
  Texture,
  Vector3,
  WebGLRenderer
} from 'three'

import { getAwesomeAnimatedColor } from '~/colors/animatedColorsLib'
import {
  atmosphereColor,
  atmosphereColorForCards,
  atmosphereColorForIsland,
  COLOR_GRAY,
  invGammaColor,
  skyColor,
  sunColor
} from '~/colors/colorLibrary'
import { makeHSL } from '~/colors/utils'
import { START_OF_GAME_DAY } from '~/constants'
import { ArcSolver } from '~/helpers/ArcSolver'
import { dayOrNight } from '~/helpers/meshAnimationHelpers'
import {
  illuminatedSmokeColorBottom,
  illuminatedSmokeColorTop
} from '~/meshes/Particles/particleSettingsLib'
import queryParams from '~/queryParams'
import { testOverdraw } from '~/renderSettings'
import {
  dayLengthSlider,
  skyTimerStiffness,
  sunSetEmphasis,
  timeOfDaySlider,
  toggleForceDayTime,
  toggleSkyControls
} from '~/userSettings'
import { globalAccess } from '~/utils/globalAccess'
import { makeBallHelper } from '~/utils/threeUtils'

import SkyDome from './SkyDome'
import Stars from './Stars'
import Sun from './Sun'
import ImageColorSampler from './utils/ImageColorSampler'
import TemporalColorStripHandler from './utils/TemporalColorStripHandler'

function sunArcResample(t: number) {
  let prescale = 1
  let preoffset = 0
  if (t > 0.97) {
    t -= 1
  } else if (t > 0.52) {
    prescale = 1.22
    preoffset = -0.05
    t -= 0.5
  }
  t = t * prescale + preoffset
  t *= 2
  t = t * 0.95 + 0.025
  return t
}

const __hsl = {
  h: 0,
  s: 0,
  l: 0
}

const __tempColor = new Color()

const NIGHT = new Color(0.18, 0.22, 0.28)
const __nightInfluence = NIGHT.clone()

const DUSK = new Color(0.0, 0.0, 0.0)
const __duskInfluence = DUSK.clone()

export default class SkySystem {
  get timeDays() {
    return this._timeDays
  }
  set timeDays(value: number) {
    if (this._timeDays !== value) {
      this._timeDays = value
      this._dirty = true
    }
  }
  set visible(value: boolean) {
    this.sun.visible = value
    this.skyDome.visible = value
    this.stars.visible = value
    this.sunAlt.visible = value
  }
  temporalColorStripHandler: TemporalColorStripHandler

  samplesSunColor: Color[]
  samplesSkyColor: Color[]
  samplesGroundColor: Color[]
  samplesAtmosphereColor: Color[]
  samplesInvGammaColor: Color[]

  mapFrames: number
  mapFramePercentOfDay: number

  skyDome: SkyDome
  stars: Stars
  sun: Sun
  sunAlt: Object3D
  sunArc: ArcSolver
  sunArcAlt: ArcSolver

  forceDayTime = toggleForceDayTime.value

  debug: boolean

  paused = true
  _firstUpdate = true
  private _timeDaysRaw = START_OF_GAME_DAY
  private _timeDays: number = 0
  private _dirty = true
  constructor(
    renderer: WebGLRenderer,
    scene: Scene,
    parent: Object3D,
    colorStrip: Texture,
    radius: number = 80,
    pointScale: number = 1,
    mapFrameHeight: number = 15,
    mapFrames: number = 48,
    debug: boolean = false,
    warp = true
  ) {
    colorStrip.generateMipmaps = false
    colorStrip.magFilter = LinearFilter
    colorStrip.minFilter = LinearFilter
    const sampler = new ImageColorSampler(colorStrip.image)

    const samplesSkyColor: Color[] = []
    const samplesSunColor: Color[] = []
    const samplesAtmosphereColor: Color[] = []
    const samplesGroundColor: Color[] = []
    const samplesInvGammaColor: Color[] = []
    const hsl = { h: 0, s: 0, l: 0 }
    const grayscale = new Color()
    function addSampleColor(
      samples: Color[],
      i: number,
      x: number,
      desaturation = 0
    ) {
      const c = sampler.sample(x, i * mapFrameHeight + 6, new Color())
      c.getHSL(hsl)
      grayscale.setRGB(hsl.l, hsl.l, hsl.l)
      c.lerp(grayscale, desaturation)
      samples.push(c)
    }
    for (let i = 0; i < mapFrames; i++) {
      addSampleColor(samplesSkyColor, i, 1)
      addSampleColor(samplesSunColor, i, 2, 0.5)
      addSampleColor(samplesAtmosphereColor, i, 7)
      addSampleColor(samplesGroundColor, i, 3)
      addSampleColor(samplesInvGammaColor, i, 6)
    }
    this.samplesSunColor = samplesSunColor
    this.samplesSkyColor = samplesSkyColor
    this.samplesGroundColor = samplesGroundColor
    this.samplesAtmosphereColor = samplesAtmosphereColor
    this.samplesInvGammaColor = samplesInvGammaColor

    const temporalColorStripHandler = new TemporalColorStripHandler(
      colorStrip,
      renderer,
      colorStrip.image.width,
      mapFrameHeight,
      mapFrames
    )

    if (debug) {
      const preview = temporalColorStripHandler.getPreviewMesh()
      preview.position.y += 0.2
      preview.scale.multiplyScalar(0.05)
      preview.rotation.x += Math.PI * -0.5

      scene.add(preview)
    }

    const skyDome = new SkyDome(
      temporalColorStripHandler.texture,
      temporalColorStripHandler.textureSize,
      radius * 0.9,
      undefined,
      undefined,
      warp,
      true
    )
    skyDome.rotation.x = 0.025 * Math.PI
    skyDome.position.y = -1.2

    parent.add(skyDome)

    const stars = new Stars(
      temporalColorStripHandler.texture,
      temporalColorStripHandler.textureSize,
      5,
      5000,
      radius * 0.95,
      8 * pointScale,
      24 * pointScale
    )
    stars.rotation.y = Math.PI * 0.66
    stars.rotation.x = Math.PI * 0.66
    stars.rotation.order = 'XZY'
    parent.add(stars)

    const sun = new Sun(
      temporalColorStripHandler.texture,
      temporalColorStripHandler.textureSize,
      radius * 0.99,
      4
    )
    parent.add(sun)

    const sunAlt = new Object3D()
    parent.add(sunAlt)

    const sunArc = new ArcSolver(
      new Vector3(2.5, 0.5, -6),
      new Vector3(0, 1.2, -6),
      new Vector3(-2.5, 0.5, -6)
    )

    const sunArcAlt = new ArcSolver(
      new Vector3(5.5, 0.5, -1),
      new Vector3(0, 5.5, -1),
      new Vector3(-5.5, 0.5, -1)
    )

    if (queryParams.debugSunMoon) {
      for (const arc of [sunArc, sunArcAlt]) {
        for (let i = 0; i < 400; i++) {
          const ratio = i / 400
          const bh = makeBallHelper(0.1, makeHSL(ratio))
          bh.position.copy(arc.sample(sunArcResample(ratio)))
          parent.add(bh)
        }
      }
    }

    this.mapFrames = mapFrames as number
    this.mapFramePercentOfDay = 1 / mapFrames

    this.skyDome = skyDome
    this.sun = sun
    this.sunArc = sunArc
    this.sunAlt = sunAlt
    this.sunArcAlt = sunArcAlt
    this.stars = stars

    this.temporalColorStripHandler = temporalColorStripHandler

    this.debug = debug

    this.timeDays = queryParams.dayPercent - 1

    if (queryParams.timeCutDuration > 0) {
      const cutTimes = [0, 0.25, 0.5, 0.75]
      let cutIndex = 0
      setInterval(() => {
        cutIndex++
        this.timeDays = cutTimes[cutIndex % cutTimes.length]
      }, queryParams.timeCutDuration * 1000)
    }

    if (toggleSkyControls.value) {
      timeOfDaySlider.listen(value => {
        this._timeDaysRaw = this.timeDays = ~~this.timeDays + value
      })
    }
  }
  updateTimeController(dt: number) {
    this._timeDaysRaw += dt / dayLengthSlider.value
    dayOrNight.night = this._timeDaysRaw % 1 > 0.5
    timeOfDaySlider.value = this._timeDaysRaw % 1
    return this._timeDaysRaw
  }
  update(dt: number) {
    if (!this.paused) {
      const ratio = 60 * dt

      const stiffness = skyTimerStiffness.value
      const mixAmt = 1.0 - Math.pow(1 - (1 - 0.985) * stiffness, ratio)

      let targetTimeDays = this.updateTimeController(dt)

      if (this.forceDayTime) {
        targetTimeDays = Math.ceil(this.timeDays - 0.25) + 0.25
      }

      //skip days instead of warp-speed catchup
      if (this.timeDays < targetTimeDays - 1) {
        this.timeDays += ~~(targetTimeDays - this.timeDays)
      }

      const delta = (targetTimeDays - this.timeDays) * mixAmt
      if (delta > 0.00001) {
        this.timeDays += delta
      }
    }
    if (this._dirty) {
      this.updateVisuals()
      this._dirty = false
    }
  }
  updateVisuals() {
    const dayPercent = wrap(this.timeDays, 0, 1)
    // dayPercent = 0.75 //midnight
    const yearPercent = dayPercent / 4
    const anglePercent = dayPercent % 1

    const sample = this.sunArc.sample(sunArcResample(anglePercent))
    if (this._firstUpdate) {
      this.sun.parent!.updateMatrixWorld(true)
      this._firstUpdate = false
    }
    sample.applyMatrix4(this.sun.parent!.matrixWorld)
    this.sun.lookAt(sample)
    const sampleAlt = this.sunArcAlt.sample(
      sunArcResample(anglePercent) * 0.6 + 0.2
    )
    globalAccess.sunPosition.value.copy(sampleAlt)
    sampleAlt.applyMatrix4(this.sunAlt.parent!.matrixWorld)
    this.sunAlt.lookAt(sampleAlt)
    const skyProgressLinear = (dayPercent + 0.25) % 1
    let skyProgress =
      skyProgressLinear + Math.sin(dayPercent * Math.PI * 4) / 16
    const skyRemainder = skyProgress - Math.floor(skyProgress)
    const sunsetWarpStrength = sunSetEmphasis.value
    if (skyRemainder > 0.25 && skyRemainder < 0.75) {
      const dayPercent = wrap((skyProgress - 0.25) * 2, 0, 1)
      const idr = 1 - dayPercent
      const warpedSkyProgress = lerp(
        skyProgress,
        skyProgress - dayPercent * 0.5 + (1 - idr * idr) * 0.5,
        skyRemainder
      )
      skyProgress +=
        (warpedSkyProgress - skyProgress) * 1.4 * sunsetWarpStrength
    }

    skyProgress -=
      (Math.sin(dayPercent * Math.PI * 2) + 1) * 0.0125 * sunsetWarpStrength

    this.temporalColorStripHandler.progress = skyProgress
    this.temporalColorStripHandler.update()
    this.stars.rotation.z = yearPercent * Math.PI * 2 + 1

    const remainder = skyProgress % this.mapFramePercentOfDay
    const frame1 =
      Math.round((skyProgress - remainder) * this.mapFrames + 1) %
      this.mapFrames
    const frame2 = (frame1 + 1) % this.mapFrames
    const mix = remainder * this.mapFrames
    sunColor.copy(this.samplesSunColor[frame1])
    sunColor.lerp(this.samplesSunColor[frame2], mix)
    illuminatedSmokeColorBottom.copy(this.samplesGroundColor[frame1])
    illuminatedSmokeColorBottom.lerp(this.samplesGroundColor[frame2], mix)
    __tempColor.setRGB(0.1, 0.1, 0.1)
    illuminatedSmokeColorBottom.add(__tempColor)
    illuminatedSmokeColorBottom.convertLinearToGamma(2.2)
    illuminatedSmokeColorTop.copy(this.samplesSkyColor[frame1])
    illuminatedSmokeColorTop.lerp(this.samplesSkyColor[frame2], mix)
    illuminatedSmokeColorTop.add(illuminatedSmokeColorBottom)
    __tempColor.copy(sunColor).multiplyScalar(0.2)
    illuminatedSmokeColorTop.add(__tempColor)
    sunColor.getHSL(__hsl)
    globalAccess.sunBrightness.value = __hsl.l * 10.0
    invGammaColor.copy(this.samplesInvGammaColor[frame1])
    invGammaColor.lerp(this.samplesInvGammaColor[frame2], mix)
    invGammaColor.r = Math.pow(1 / (0.75 + invGammaColor.r * 1.5), 2)
    invGammaColor.g = Math.pow(1 / (0.75 + invGammaColor.g * 1.5), 2)
    invGammaColor.b = Math.pow(1 / (0.75 + invGammaColor.b * 1.5), 2)
    if (testOverdraw.value) {
      atmosphereColor.setRGB(0, 0, 0)
      atmosphereColorForIsland.setRGB(0, 0, 0)
      atmosphereColorForCards.setRGB(0, 0, 0)
    } else if (!queryParams.bgFlash) {
      atmosphereColor.copy(this.samplesAtmosphereColor[frame1])
      atmosphereColor.lerp(this.samplesAtmosphereColor[frame2], mix)
      skyColor.copy(this.samplesSkyColor[frame1])
      skyColor.lerp(this.samplesSkyColor[frame2], mix)
      if (queryParams.fireworkLighting) {
        atmosphereColor.add(getAwesomeAnimatedColor(1)).sub(COLOR_GRAY)
      }

      const duskInfluence =
        Math.cos((this.timeDays + 0.5) * Math.PI * 4) * 0.5 + 0.5

      const combinedColor = atmosphereColor.clone()
      combinedColor.lerp(skyColor, duskInfluence)

      const nightInfluence =
        Math.sin((this.timeDays + 0.5) * Math.PI * 2) * 0.5 + 0.5

      atmosphereColorForIsland.setRGB(0.5, 0.5, 0.5).lerp(combinedColor, 0.5)
      __duskInfluence.copy(DUSK).multiplyScalar(duskInfluence)
      atmosphereColorForIsland.add(__duskInfluence)

      __nightInfluence.copy(NIGHT).multiplyScalar(nightInfluence)
      atmosphereColorForIsland.add(__nightInfluence)
      atmosphereColorForCards.setRGB(0.5, 0.5, 0.5).lerp(combinedColor, 0.25)
    }
  }
}
