import { closeEnough, getIntRange } from '@opensky/shared/utils/math'
import { listenToProperty } from '@opensky/shared/utils/propertyListeners'
import { Color, Vector3 } from 'three'

import { getAssetsManager } from '~/assets'
import {
  COLOR_PROGRESSION_LINE_BASE,
  COLOR_PROGRESSION_LINE_FILLED,
  COLOR_PROGRESSION_LINE_TUTORIAL_BASE
} from '~/colors/colorLibrary'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import RectangleMaterial from '~/materials/RectangleMaterial'
import FireCracker from '~/meshes/FireCracker'
import RectangleMesh from '~/meshes/RectangleMesh'
import { Easing } from '~/systems/animation/Easing'
import { AnimatedObject } from '~/systems/animation/RawTweener'
import { simpleTweener } from '~/systems/animation/tweeners'
import { buildParameters } from '~/utils/jsUtils'
import { onNextFrame } from '~/utils/onNextFrame'

import ProgressionTick, { TickIndicator } from './ProgressionTick'

const MAGIC_NUMBER = 80.0
interface ProgressLineParameters {
  ticks: TickIndicator[]
  ratio: number
  padding: number
  colorBase: Color
  colorProgress: Color
  initProgress: number
  tickRadius: number
  tickThickness: number
  tickMeshScale: number
  tickDashOverlap: number
  tickCurrent: TickIndicator
  tickPass: TickIndicator
  tickColor: Color
}

const __defaultParams: ProgressLineParameters = {
  ticks: [TickIndicator.CHECK_BLUE, TickIndicator.NONE],
  ratio: 0.06,
  padding: 0.5,
  colorBase: COLOR_PROGRESSION_LINE_BASE,
  colorProgress: COLOR_PROGRESSION_LINE_FILLED,
  initProgress: 0.66667,
  tickRadius: 10,
  tickThickness: 1,
  tickMeshScale: 140,
  tickDashOverlap: 0.9,
  tickCurrent: TickIndicator.CURRENT,
  tickPass: TickIndicator.CHECK_BLUE,
  tickColor: COLOR_PROGRESSION_LINE_TUTORIAL_BASE
}

const __indicatorsThatSupportSparkle = [
  TickIndicator.CHECK_BLUE,
  TickIndicator.CHECK_LILAC,
  TickIndicator.CURRENT,
  TickIndicator.CURRENT_BIG
]

function __calloutChangeIndicator(
  tick: ProgressionTick,
  indicator: TickIndicator
) {
  tick.indicator = indicator
  if (__indicatorsThatSupportSparkle.includes(indicator)) {
    onNextFrame(() => {
      const flashColor = new Color(1, 1, 1)
      const fireCracker = new FireCracker(
        getAssetsManager().getAsset('particle'),
        fc => {
          fc.parent!.remove(fc)
        },
        30,
        40000,
        40000,
        500,
        0,
        flashColor
      )
      tick.add(fireCracker)
    })
  }
}

export default class ProgressionLine {
  private _progressAnimation: AnimatedObject<any> | undefined
  newTickType: TickIndicator = TickIndicator.CURRENT
  progressTickPercent(tickPercent: number, duration = 0) {
    return this._changeProgress(
      this.progress + tickPercent / (this._ticks.length - 1),
      duration
    )
  }
  private _changeProgress(newProgress: number, duration = 0) {
    if (this._progressAnimation) {
      this._progressAnimation.kill()
      this._progressAnimation = undefined
    }
    if (duration) {
      this._progressAnimation = simpleTweener.to({
        description: 'progress line progress',
        target: this as ProgressionLine,
        propertyGoals: {
          progress: newProgress
        },
        easing: Easing.Quartic.Out,
        duration
      })
      return this._progressAnimation
    } else {
      this.progress = newProgress
      return undefined
    }
  }
  private _ticks: ProgressionTick[]
  private _progressLineMaterial: RectangleMaterial
  progressWholeTickForward(duration = 0) {
    return this._changeProgress(
      this.progress + 1 / (this._ticks.length - 1),
      duration
    )
  }
  progressWholeTickBack(duration = 0) {
    return this._changeProgress(
      this.progress - 1 / (this._ticks.length - 1),
      duration
    )
  }
  setCurrentTickIndicator(indicator: TickIndicator) {
    const currentIndex = ~~(this.progress * (this._ticks.length - 1))
    __calloutChangeIndicator(this._ticks[currentIndex], indicator)
  }
  mesh: RectangleMesh

  constructor(options: Partial<ProgressLineParameters> = {}) {
    const params = buildParameters(__defaultParams, options)
    const dashParameters = {
      padding: params.padding,
      ratio: params.ratio,
      count: params.ticks.length
    }
    const material = new RectangleMaterial({
      progressFill: {
        colorLeft: params.colorProgress,
        colorRight: params.colorBase,
        initValue: params.initProgress
      },
      dashParameters
    })
    const dashesCountRatioPadding = material.uniforms.dashesCountRatioPadding
      .value as Vector3
    const dashedLine = new RectangleMesh(material)
    // dashedLine.matrix.setColor(params.colorBase)
    const ticks: ProgressionTick[] = []
    const ringPins = getIntRange(dashParameters.count).map(i => {
      const tickProgressThresh = i / (dashParameters.count - 1)
      const progressed = tickProgressThresh <= params.initProgress
      const tick = new ProgressionTick(
        progressed,
        closeEnough(tickProgressThresh, params.initProgress)
          ? params.tickCurrent
          : progressed
          ? params.tickPass
          : TickIndicator.EMPTY,
        params.tickRadius,
        params.tickThickness,
        params.colorBase,
        params.colorProgress
        // params.tickColor
      )
      // tickMesh.scale.multiplyScalar(params.tickMeshScale * params.tickRadius)
      // tickMesh.rotation.x = -Math.PI * 0.5
      // tickMesh.frustumCulled = false
      const ringPosPin = new Pin(
        ((params.padding + (i * 2) / (dashParameters.count - 1)) /
          (params.padding + 1)) *
          0.5,
        0.5
      )
      tick.matrix.setConstraints(
        Pin.fromPixels(params.tickRadius * 2, params.tickRadius * 2),
        ReadonlyPin.Center,
        ringPosPin
      )
      dashedLine.add(tick)
      ticks.push(tick)
      return ringPosPin
    })
    // TODO: Fix this vvvvv
    function updateDashRatio() {
      // TODO: Fix this vvvvv
      // const padlessWidth = outerBar.size.x / (1 + dashParameters.padding)
      const padlessWidth = 75 / (1 + dashParameters.padding)
      dashesCountRatioPadding.y =
        (params.tickRadius * params.tickDashOverlap * 2.0 * MAGIC_NUMBER) /
        (padlessWidth / (dashParameters.count - 1))
      dashesCountRatioPadding.z = Math.max(0.001, dashParameters.padding)
      dashesCountRatioPadding.x = dashParameters.count - 1
    }
    // TODO: Fix this vvvvv
    // listenToProperty(outerBar.size, 'x', updateDashRatio)
    listenToProperty(dashedLine, 'matrix', updateDashRatio)
    // TODO bad^^
    listenToProperty(dashParameters, 'padding', updateDashRatio)
    listenToProperty(dashParameters, 'count', updateDashRatio)
    for (let i = 0; i < ringPins.length; i++) {
      const ringPosPin = ringPins[i]
      ringPosPin.x.scale =
        ((params.padding + (i * 2) / (ringPins.length - 1)) /
          (params.padding + 1)) *
        0.5
    }

    dashedLine.name = 'line'
    this.mesh = dashedLine
    this._ticks = ticks
    this._progressLineMaterial = material
  }

  get progress() {
    return this._progressLineMaterial.progressFill
  }

  set progress(value: number) {
    const oldValue = this._progressLineMaterial.progressFill
    const low = oldValue <= value ? oldValue : value
    const high = oldValue > value ? oldValue : value
    for (let i = 0; i < this._ticks.length; i++) {
      const tickRatio = i / (this._ticks.length - 1)
      if (tickRatio <= high && tickRatio > low) {
        const tick = this._ticks[i]
        const progressed = value > oldValue
        tick.progressed = progressed
        __calloutChangeIndicator(
          tick,
          progressed ? this.newTickType : TickIndicator.NONE
        )
      }
    }
    this._progressLineMaterial.progressFill = value
  }
}
