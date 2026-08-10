import { Object3D, Quaternion, Vector3 } from 'three'

import { TimeUniformHelper } from '~/timeUniforms'
import { removeFromParent } from '~/utils/threeUtils'

import { ColorMaker } from './ColorMaker'
import IEmitter from './IEmitter'
import missileParticlePathMakerLib, {
  MissileParticlePathMaker
} from './missileParticlePathMakerLib'

export default class Emitter extends Object3D implements IEmitter {
  backlogPositions: Vector3[] = []
  backlogOrientations: Quaternion[] = []
  backlogParticlesPerMeter: number[] = []
  backlogParticlesPerSecond: number[] = []
  backlogTimes: number[] = []

  cursorEnergy = 0
  cursorTime = 0
  cursorPosition = new Vector3()
  cursorDirectionOrPos2 = new Vector3()
  cursorOrientation = new Quaternion()

  backlogCount = 0

  protected _nextPosition: Vector3
  protected _nextOrientation: Quaternion
  protected _backlogMaxSize = 0
  protected _deltaPos = new Vector3()
  protected _positionStep = new Vector3()

  constructor(
    pos: Vector3,
    public particlePathMaker: MissileParticlePathMaker = missileParticlePathMakerLib.default,
    private _timeUniformHelper: TimeUniformHelper,
    public colorMaker?: ColorMaker,
    public energyLimit = Infinity
  ) {
    super()
    this.cursorPosition.copy(pos)
    this.cursorDirectionOrPos2.copy(pos)
    this.position.copy(pos)
  }
  update(
    position: Vector3,
    orientation: Quaternion,
    particlesPerMeter: number,
    particlesPerSecond: number
  ) {
    if (this._backlogMaxSize === this.backlogCount) {
      this._addBacklogSlot()
      this._backlogMaxSize++
    }
    this.backlogParticlesPerMeter[this.backlogCount] = particlesPerMeter
    this.backlogParticlesPerSecond[this.backlogCount] = particlesPerSecond
    this.backlogPositions[this.backlogCount].copy(position)
    this.backlogOrientations[this.backlogCount].copy(orientation)
    this.backlogTimes[this.backlogCount] = this._timeUniformHelper.time
    this.backlogCount++
    this.position.copy(position)
  }
  update2(
    _position: Vector3,
    _position2: Vector3,
    _orientation: Quaternion,
    _particlesPerMeter: number,
    _particlesPerSecond: number
  ) {
    throw new Error(
      'update2 not supported on base Emitter. Override in baseclass'
    )
  }
  initSteps(backlogIndex: number, steps: number, dt: number) {
    this._nextPosition = this.backlogPositions[backlogIndex]
    this._nextOrientation = this.backlogOrientations[backlogIndex]
    this._deltaPos.copy(this._nextPosition).sub(this.cursorPosition)
    this._positionStep.copy(this._deltaPos).multiplyScalar(1 / steps)
    this._deltaPos.multiplyScalar(0.01667 / dt)
  }
  subStep(lerpAmt: number) {
    this.cursorPosition.add(this._positionStep)
    this.cursorDirectionOrPos2.lerp(this._deltaPos, lerpAmt)
    this.cursorOrientation.slerp(this._nextOrientation, lerpAmt)
  }
  protected _addBacklogSlot() {
    this.backlogPositions.push(new Vector3())
    this.backlogOrientations.push(new Quaternion(0, 0, 0, 1))
  }
  dispose() {
    removeFromParent(this)
  }
}
