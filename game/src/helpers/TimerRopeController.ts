import { BufferGeometry, Color, Mesh, MeshBasicMaterial, Object3D } from 'three'

import { makeHSL } from '~/colors/utils'
import MagicFireHighlightMeshMaterial from '~/materials/MagicFireHighlightMeshMaterial'
import RGBAVertexColorMeshMaterial from '~/materials/RGBAVertexColorMeshMaterial'
import { getFlareGeometry } from '~/meshes/Particles/flareGeometryLibrary'
import { getBeamLauncher } from '~/meshes/Particles/particleLauncherFactory'
import { Easing } from '~/systems/animation/Easing'
import { simpleTweener } from '~/systems/animation/tweeners'
import { AnimatedBool } from '~/utils/AnimatedBool'
import { taskTimer } from '~/utils/taskTimer'
import { findContainingScene } from '~/utils/threeUtils'

import { getBlendModeParamsByIndices } from './blendModeHelpers'
import { playSound, playSoundLoop, stopSoundLoop } from './soundHelpers'

function __progressToX(progress: number) {
  return (progress * 2 - 1) * 3.65 + 0.01
}

const endTurnTickLoopName = 'EndTurnTick-Loop-Higher'
export default class TimerRopeController {
  private _endTime: number
  private _startTimeMS: number
  private _animatedStartTimeMS = { value: 0 }

  private _sparkler1: Object3D
  private _sparkler2: Object3D
  private _cancelSparks?: () => void
  private _mutes = 0
  private _sparklesVisible: boolean
  private _visibility = new AnimatedBool(
    value => {
      const vis = value > 0
      this._ropeMesh.visible = vis
      this._sparkler1.visible = vis
      this._ropeShadowMesh.visible = vis
      this._ropeMesh.material.opacity = value * 0.85
      this._ropeShadowMesh.material.opacity = value * 0.25
    },
    false,
    300
  )
  private _playSoundLoop = false
  get playSoundLoop(): boolean {
    return this._playSoundLoop
  }
  set playSoundLoop(value: boolean) {
    if (value === this._playSoundLoop) {
      return
    }
    if (value) {
      playSoundLoop('audioFxCommon', endTurnTickLoopName, undefined, 0.5)
    } else {
      stopSoundLoop('audioFxCommon', endTurnTickLoopName)
    }
    this._playSoundLoop = value
  }

  private _secondsRemaining = 0
  get secondsRemaining(): number {
    return this._secondsRemaining
  }
  set secondsRemaining(value: number) {
    if (value === this._secondsRemaining) {
      return
    }

    this.playSoundLoop = value < this._timerMaxMS * 0.001 && value > 0

    value = value <= 0 ? 1 : value

    const valueChange = value - this._secondsRemaining
    if (valueChange === -1 && value >= 1 && value <= 4) {
      playSound('audioFxCommon', `EndTurnStinger-${5 - value}`)
    }

    this._secondsRemaining = value
  }

  get mutes(): number {
    return this._mutes
  }
  set mutes(value: number) {
    this._mutes = value
    if (this._mutes === 0) {
      this.endTime = this._endTime
    }
  }
  get sparklesVisible(): boolean {
    return this._sparklesVisible
  }
  set sparklesVisible(value: boolean) {
    if (value === this._sparklesVisible) {
      return
    }
    if (value && !this._cancelSparks) {
      const x = __progressToX(this._ropeMesh.material.progress)
      this._sparkler1.position.x = x
      this._sparkler2.position.x = x
      this._sparkler1.updateMatrixWorld()
      this._sparkler2.updateMatrixWorld()
      this._cancelSparks = getBeamLauncher(
        'ropeSparkler',
        findContainingScene(this._ropeMesh)!
      ).startLineEmitter(this._sparkler1, this._sparkler2).destroy
    } else if (this._cancelSparks) {
      this._cancelSparks()
      this._cancelSparks = undefined
    }
    this._sparklesVisible = value
  }

  set endTime(endTime: number) {
    const oldEndTime = this._endTime
    this._endTime = endTime
    if (endTime - oldEndTime > 6000) {
      this.mute()
    }
    if (this._mutes > 0) {
      return
    }
    this._startTimeMS = endTime - this._timerMaxMS
    simpleTweener.to({
      description: 'turn timer time gain',
      target: this._animatedStartTimeMS,
      duration: 400,
      easing: Easing.Quartic.Out,
      propertyGoals: {
        value: this._startTimeMS
      }
    })
  }
  get endTime() {
    return this._endTime
  }

  constructor(
    private _ropeMesh: Mesh<BufferGeometry, MagicFireHighlightMeshMaterial>,
    private _ropeShadowMesh: Mesh<BufferGeometry, MeshBasicMaterial>,
    private _timerMaxMS: number = 10000
  ) {
    _ropeMesh.visible = false
    _ropeMesh.material.opacity = 0
    _ropeShadowMesh.visible = false

    const color = makeHSL(Math.random(), 1, 0.75)
    const flareMat = new RGBAVertexColorMeshMaterial(
      {
        screenspaceMode: true,
        blendMode: 'customAddAlpha',
        premultiplyAlpha: true,
        opacity: 0.7,
        color
      },
      {
        transparent: true,
        depthTest: true,
        depthWrite: false,
        ...getBlendModeParamsByIndices(1, 1)
      }
    )
    const flareGeo = getFlareGeometry(
      'ropeTimerSparkler',
      new Color(2.5, 1.3, 0.25),
      new Color(0, -0.5, -0.5)
    )
    this._sparkler1 = new Mesh(flareGeo, flareMat)
    this._sparkler1.visible = false
    this._sparkler1.scale.multiplyScalar(2)
    _ropeMesh.add(this._sparkler1)
    this._sparkler2 = new Object3D()
    _ropeMesh.add(this._sparkler2)
    this._sparkler1.position.set(-0.1, -0.1, 0)
    this._sparkler2.position.set(0.1, -0.1, 0)
  }

  mute(durationSeconds = 0.15) {
    this.mutes++
    taskTimer.add(() => {
      this.mutes--
    }, durationSeconds)
  }

  update() {
    const now = Date.now()
    const timeMS = now - this._startTimeMS
    const animatedTimeMS = now - this._animatedStartTimeMS.value

    const progress =
      1 - Easing.Custom.RopeTimerProgress(timeMS / this._timerMaxMS)
    const animatedProgress =
      1 - Easing.Custom.RopeTimerProgress(animatedTimeMS / this._timerMaxMS)

    this._visibility.value = progress > 0 && progress < 1 && this._mutes === 0

    if (this._mutes > 0) {
      this.sparklesVisible = false
      this.playSoundLoop = false
      return
    }

    const timerMax = Math.floor(this._timerMaxMS * 0.001)
    this.secondsRemaining = -(Math.floor(timeMS * 0.001) - timerMax)

    this._ropeMesh.material.progress = animatedProgress - 0.015
    this.sparklesVisible =
      progress > 0 && progress < 1 && this._visibility.animatedValue > 0
    const s =
      this._visibility.animatedValue * (1.5 + Math.pow(Math.random(), 2) * 0.5)
    this._sparkler1.scale.setScalar(s)
    const x = __progressToX(animatedProgress)
    if (this.sparklesVisible) {
      this._sparkler2.position.x = this._sparkler1.position.x
      this._sparkler1.position.x = x
    }
  }
}
