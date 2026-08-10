import { clamp } from '@opensky/shared/utils/math'
import { Color, GreaterEqualDepth } from 'three'

import { getAssetsManager } from '~/assets/index'
import { PaletteMesh2D } from '~/assets/MeshTypes'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import { playSound } from '~/helpers/soundHelpers'
import RectangleMaterial from '~/materials/RectangleMaterial'
import Mesh2D from '~/meshes/Mesh2D'
import Object2D from '~/meshes/Object2D'
import { getBeamLauncher } from '~/meshes/Particles/particleLauncherFactory'
import RectangleMesh from '~/meshes/RectangleMesh'
import { Ease, Easing } from '~/systems/animation/Easing'
import { simpleTweener } from '~/systems/animation/tweeners'
import * as textOptions from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'
import Matrix1Plus from '~/utils/Matrix1Plus'
import { taskTimer } from '~/utils/taskTimer'
import { findContainingScene, isDeeplyVisible } from '~/utils/threeUtils'

const __timeGainLabelOptions = [
  textOptions.buttonTextShadow,
  textOptions.buttonText
]
class BarLayer {
  private _sparklesActive: boolean = true
  bar: PaletteMesh2D
  playheadMesh: Object2D

  toggleSparkles(v: boolean) {
    this._sparklesActive = v
    if (!v && this._cancelSparks) {
      this._cancelSparks()
      this._cancelSparks = undefined
    }
  }
  private _sizePin: Pin
  private _rangeMS: number
  private _color = new Color(0xffff00)
  private _playheadSparkler1: Object2D
  private _playheadSparkler2: Object2D
  private _cancelSparks: (() => void) | undefined

  constructor(
    private _minMS: number,
    maxMS: number,
    private _hueM1: Matrix1Plus,
    private _satM1: Matrix1Plus,
    private _valM1: Matrix1Plus,
    private _perceptualEase: Ease
  ) {
    this._rangeMS = maxMS - _minMS
    const bar = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'rectangle',
      true
    )
    bar.matrix.setColor(this._color)
    const sizePin = new Pin(1, 1)
    bar.matrix.setConstraints(sizePin, ReadonlyPin.TopLeft, ReadonlyPin.TopLeft)
    this._sizePin = sizePin
    const playheadMesh = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'rectangle',
      true
    )
    playheadMesh.matrix.setConstraints(
      new Pin(0, 1, 2),
      ReadonlyPin.BottomRight,
      sizePin
    )
    this.bar = bar

    this.playheadMesh = playheadMesh
    this.playheadMesh.visible = false
    this._playheadSparkler1 = new Object2D()
    this._playheadSparkler2 = new Object2D()
    // this._playheadSparkler1 = new FireCracker(
    //   getAssetsManager().getAsset('particle'),
    //   () => this._playheadSparkler1.parent!.remove(this._playheadSparkler1),
    //   12,
    //   3000,
    //   12000,
    //   50000,
    //   0,
    //   flashColor
    // )
    // this._playheadSparkler2 = new FireCracker(
    //   getAssetsManager().getAsset('particle'),
    //   () => this._playheadSparkler2.parent!.remove(this._playheadSparkler2),
    //   12,
    //   3000,
    //   12000,
    //   50000,
    //   0,
    //   flashColor
    // )
    // // this._playheadSparkler1.layers = this._mesh.layers
    this._playheadSparkler1.matrix.setConstraints(
      Pin.fromPixels(1, 1),
      ReadonlyPin.Center,
      ReadonlyPin.Center
    )
    // this._playheadSparkler2.layers = this._mesh.layers
    this._playheadSparkler2.matrix.setConstraints(
      Pin.fromPixels(1, 1),
      ReadonlyPin.Center,
      ReadonlyPin.Bottom
    )
    this.playheadMesh.add(this._playheadSparkler1)
    this.playheadMesh.add(this._playheadSparkler2)
  }
  updateTime(timeMS: number) {
    const timeRatio = 1 - (timeMS - this._minMS) / this._rangeMS
    const scale = 1 - this._perceptualEase(1 - clamp(timeRatio, 0, 1))
    this._color.setHSL(
      this._hueM1.getValue(timeRatio),
      this._satM1.getValue(timeRatio),
      this._valM1.getValue(timeRatio)
    )

    this.bar.matrix.setColor(this._color)
    this._sizePin.x.scale = scale
    const playheadWasVisible = this.playheadMesh.visible
    this.playheadMesh.visible =
      scale < 1 &&
      scale > 0 &&
      this._sparklesActive &&
      !!(this.playheadMesh.parent && isDeeplyVisible(this.playheadMesh.parent))
    if (!playheadWasVisible && this.playheadMesh.visible) {
      this._cancelSparks = getBeamLauncher(
        'timerSparkler',
        findContainingScene(this.playheadMesh)!
      ).startLineEmitter(
        this._playheadSparkler1,
        this._playheadSparkler2
      ).destroy
    } else if (
      playheadWasVisible &&
      !this.playheadMesh.visible &&
      this._cancelSparks
    ) {
      this._cancelSparks()
      this._cancelSparks = undefined
    }
  }
  highlightTimeGain() {
    const material = new RectangleMaterial({
      blendMode: 'screenAlpha'
    })
    material.depthFunc = GreaterEqualDepth

    const mesh = new RectangleMesh(material)
    const sizePin = new Pin(1, 1)
    mesh.matrix.setConstraints(
      sizePin,
      ReadonlyPin.TopLeft,
      new Pin(this._sizePin.x.scale, 0)
    )

    // mesh.position.copy(this._mesh.position)
    this.bar.parent!.add(mesh)
    simpleTweener.to({
      description: 'fade time gain',
      target: material,
      duration: 2500,
      propertyGoals: {
        opacity: 0
      },
      onComplete: () => mesh.parent!.remove(mesh)
    })
  }
  addTimeGainLabel(durMS: number) {
    if (this._sizePin.x.scale > 0.99 || this._sizePin.x.scale < 0.01) {
      return
    }
    const parent = this.bar.parent
    const num =
      durMS < 700
        ? (Math.round(durMS * 0.01) * 0.1).toFixed(1)
        : Math.round(durMS * 0.001)
    if (parent && durMS * 0.001 < 10) {
      __timeGainLabelOptions.forEach(opts => {
        const textMesh = new UITextMesh(`+${num}s`, opts)
        textMesh.matrix.setConstraintsPosition(
          new Pin(clamp(this._sizePin.x.scale, 0.03, 0.97), 1, 0, 0)
        )
        parent.add(textMesh)
        const animVal = { value: 0 }
        const onUpdate = () => {
          const v = animVal.value
          const vo = Math.min(v * 10, (1 - v) * 5)
          const vx = (Easing.Quintic.Out(v) - 0.5) * 20
          textMesh.matrix.opacity = clamp(vo, 0, 1)
          textMesh.matrix.offset.y.offset = -(20 + vx)
        }
        onUpdate()
        simpleTweener.to({
          description: 'time gain label',
          target: animVal,
          propertyGoals: { value: 1 },
          duration: 2000,
          onUpdate,
          onComplete: () => {
            textMesh.parent!.remove(textMesh)
          }
        })
      })
    }
  }
}

export default class TurnTimer {
  toggleSparkles(v: boolean) {
    for (const bl of this._barLayers) {
      bl.toggleSparkles(v)
    }
  }
  private _endTime: number
  set endTime(endTime: number) {
    this._endTime = endTime
    const newStartTime = endTime - this._timerMaxMS
    const delta = newStartTime - this._startTimeMS
    const now = performance.now()
    if (delta > 0 && now - this._globDurationMS > this._lastGlobStart) {
      playSound('audioFxCommon', 'TimeGain')
      this._gainReferenceStartTimeMS = this._startTimeMS
      this._lastGlobStart = now
      // if (this.mesh.position.y >= -0.1) {
      for (const barLayer of this._barLayers) {
        barLayer.highlightTimeGain()
      }
      taskTimer.add(() => {
        for (const barLayer of this._barLayers) {
          barLayer.addTimeGainLabel(
            this._startTimeMS - this._gainReferenceStartTimeMS
          )
        }
      }, this._globDurationMS * 0.001)
      // }
    }
    this._startTimeMS = newStartTime
    simpleTweener.to({
      description: 'turn timer time gain',
      target: this._virtualStartTimeMS,
      duration: delta > 10000 ? 0 : 200,
      easing: Easing.Quartic.Out,
      propertyGoals: {
        value: newStartTime
      }
    })
  }
  get endTime() {
    return this._endTime
  }

  set paused(val: boolean) {
    this._paused = val
  }
  locked = false
  mesh: Object2D
  _sizePin: Pin
  private _startTimeMS: number = 0
  private _gainReferenceStartTimeMS: number = 0
  private _virtualStartTimeMS = { value: 0 }
  private _barLayers: BarLayer[]
  private _globDurationMS = 400
  private _lastGlobStart = 0

  private _lastRealNow: number = Date.now()

  private _paused = false
  constructor(
    public name: 'end-turn' | 'normal-button',
    private _timerMaxMS: number,
    timerWarnFraction: number
  ) {
    const container = new Object2D()
    const backgroundMesh = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'rectangle',
      true
    )
    backgroundMesh.matrix.setColor(new Color('black'))
    backgroundMesh.frustumCulled = false
    const barContainer = new Object2D()
    const playHeadContainer = new Object2D()

    this.mesh = container

    const warningTimerMS = _timerMaxMS * timerWarnFraction

    const barLayers = [
      new BarLayer(
        warningTimerMS,
        _timerMaxMS,
        new Matrix1Plus(10, -9.8, 0, 0.3),
        new Matrix1Plus(0, 0.8, 0, 1),
        new Matrix1Plus(-10, 10.3, 0.3, 0.45),
        Easing.Custom.RopeTimerProgress
      ),
      new BarLayer(
        0,
        warningTimerMS,
        new Matrix1Plus(0, 0.3, 0, 1),
        new Matrix1Plus(0, 0.8, 0, 1),
        new Matrix1Plus(0, 0.5, 0, 1),
        Easing.Linear
      )
    ]
    barLayers.forEach(barLayer => {
      const barMesh = barLayer.bar
      const playHeadMesh = barLayer.playheadMesh
      barContainer.add(barMesh)
      playHeadContainer.add(playHeadMesh)
    })
    this._startTimeMS = Date.now()
    this._barLayers = barLayers

    const timerFrameMesh = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      `timer-bar-${name}`,
      undefined,
      true
    ) as Mesh2D
    container.add(backgroundMesh)
    container.add(barContainer)
    container.add(timerFrameMesh)
    container.add(playHeadContainer)

    timerFrameMesh.shouldRenderAsGroup = true
    playHeadContainer.shouldRenderAsGroup = true
    const sizePin = new Pin(1, 0, 0, 40)
    this._sizePin = sizePin
    if (name === 'normal-button') {
      container.matrix.setConstraints(
        new Pin(1, 1, -10),
        ReadonlyPin.TopLeft,
        ReadonlyPin.TopLeft.cloneOffset(0, 0.5)
      )
    } else {
      // end turn!
      sizePin.y.offset = 8
      // Layout bar & background
      const offsetFromLeft = 8
      container.matrix.setConstraints(
        new Pin(1, 0, -offsetFromLeft, 10),
        ReadonlyPin.TopLeft,
        ReadonlyPin.TopLeft.cloneOffset(offsetFromLeft, -10)
      )
    }
  }
  destroy() {
    this.mesh.visible = false
  }

  update() {
    const now = this._getVirtualNow()
    const timeMS = now - this._virtualStartTimeMS.value
    for (const barLayer of this._barLayers) {
      barLayer.updateTime(timeMS)
    }
  }
  private _getVirtualNow() {
    if (!this._paused) {
      this._lastRealNow = Date.now()
    }
    return this._lastRealNow
  }
}
