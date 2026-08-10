import { Quaternion, Vector3 } from 'three'

import { TimeUniformHelper } from '~/timeUniforms'

import beamParticlePathMakerLib, {
  BeamParticlePathMaker
} from './beamParticlePathMakerLib'
import { ColorMaker } from './ColorMaker'
import Emitter from './Emitter'

export default class BeamEmitter extends Emitter {
  backlogPositions2: Vector3[] = []

  protected _deltaPos2 = new Vector3()
  protected _positionStep2 = new Vector3()
  private _nextPosition2: Vector3

  constructor(
    pos: Vector3,
    particlePathMaker: BeamParticlePathMaker = beamParticlePathMakerLib.default,
    _timeUniformHelper: TimeUniformHelper,
    colorMaker?: ColorMaker,
    energyLimit = Infinity
  ) {
    super(pos, particlePathMaker, _timeUniformHelper, colorMaker, energyLimit)
    this.cursorDirectionOrPos2.copy(pos)
  }
  update2(
    position: Vector3,
    position2: Vector3,
    orientation: Quaternion,
    particlesPerMeter: number,
    particlesPerSecond: number
  ) {
    // console.log(
    //   'update2',
    //   position,
    //   position2,
    //   orientation,
    //   particlesPerMeter,
    //   particlesPerSecond
    // )
    const blc = this.backlogCount
    super.update(position, orientation, particlesPerMeter, particlesPerSecond)
    this.backlogPositions2[blc].copy(position2)
  }
  initSteps(backlogIndex: number, steps: number) {
    this._nextPosition = this.backlogPositions[backlogIndex]
    this._nextPosition2 = this.backlogPositions2[backlogIndex]
    this._nextOrientation = this.backlogOrientations[backlogIndex]
    this._deltaPos.copy(this._nextPosition).sub(this.cursorPosition)
    this._positionStep.copy(this._deltaPos).multiplyScalar(1 / steps)
    this._deltaPos2.copy(this._nextPosition2).sub(this.cursorDirectionOrPos2)
    this._positionStep2.copy(this._deltaPos2).multiplyScalar(1 / steps)
  }
  subStep(lerpAmt: number) {
    this.cursorPosition.add(this._positionStep)
    this.cursorDirectionOrPos2.add(this._positionStep2)
    this.cursorOrientation.slerp(this._nextOrientation, lerpAmt)
  }
  protected _addBacklogSlot() {
    super._addBacklogSlot()
    this.backlogPositions2.push(new Vector3())
  }
}
