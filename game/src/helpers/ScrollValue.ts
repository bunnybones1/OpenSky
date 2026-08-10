import { clamp, lerp } from '@opensky/shared/utils/math'

import { Easing } from '~/systems/animation/Easing'
import { simpleTweener } from '~/systems/animation/tweeners'

//pps = pixels per second

const MIN_SPEED_PPS = 100
const STICKING_RATE_PPS = 5
const EDGE_TOLERANCE = 5
export default class ScrollValue {
  applyMarginSpring: boolean = true
  speedPPS = 0
  private _outerSize = 100
  get outerSize() {
    return this._outerSize
  }
  set outerSize(value) {
    if (this._outerSize === value) {
      return
    }

    const oldOuterSize = this._outerSize
    this._outerSize = value

    if (this._tailEnd) {
      const atBottom = this._innerSize + this.innerPos - 5 < oldOuterSize
      const delta = oldOuterSize - value
      if (atBottom) {
        this.addPosition(-delta)
      }
    }
  }
  private _innerSize = 200
  get innerSize() {
    return this._innerSize
  }
  set innerSize(value) {
    if (this._innerSize === value) {
      return
    }

    const oldInnerSize = this._innerSize
    this._innerSize = value

    if (this._tailEnd) {
      const atBottom = oldInnerSize + this.innerPos - 5 < this._outerSize
      const delta = oldInnerSize - value
      if (atBottom) {
        this.addPosition(delta)
      }
    }
  }
  private _innerPosVirtual = 0
  innerPos = 0
  braking = true
  private _friction = 0.05
  private _brakingFriction = 0.25
  private _marginMax = 200

  constructor(private _tailEnd = false) {
    //
  }

  private _getMarginStretch() {
    if (this._innerPosVirtual > 0 || this._innerSize < this._outerSize) {
      return this._innerPosVirtual
    } else if (this._innerPosVirtual < this._outerSize - this._innerSize) {
      return -(this._outerSize - this._innerSize - this._innerPosVirtual)
    } else {
      return 0
    }
  }

  addPosition(delta: number) {
    this.setPosition(this._innerPosVirtual + delta)
  }

  update(dt: number) {
    const ratio = 60 * dt

    if (this.speedPPS !== 0) {
      let speed = this.speedPPS
      const frictionMix = Math.pow(
        1 - (this.braking ? this._brakingFriction : this._friction),
        ratio
      )
      const speedAmp = Math.abs(speed)
      const speedSign = Math.sign(speed)
      const speedAmpChange = speedAmp * (1 - frictionMix)

      let newSpeedAmp = speedAmp - speedAmpChange
      if (newSpeedAmp < MIN_SPEED_PPS) {
        newSpeedAmp -= STICKING_RATE_PPS
      }
      if (newSpeedAmp > 0) {
        speed = Math.max(newSpeedAmp, 0) * speedSign
        this.setPosition(this._innerPosVirtual + speed * dt)
        this.speedPPS = speed
      } else {
        this.speedPPS = 0
      }
    }

    const marginStretch = this._getMarginStretch()

    if (marginStretch !== 0) {
      if (this.applyMarginSpring) {
        const marginStretchMix = Math.pow(1 - 0.35, ratio)
        this.addPosition(
          -marginStretch * (1 - marginStretchMix) +
            Math.sign(-marginStretch) * 0.5
        )
      }
    }
  }

  setPosition(pos: number) {
    this._innerPosVirtual = clamp(
      pos,
      this._innerSize > this._outerSize
        ? this._outerSize - this._innerSize - this._marginMax
        : 0,
      this._marginMax
    )

    const marginStretch = this._getMarginStretch()

    if (marginStretch !== 0) {
      const mSign = Math.sign(marginStretch)
      const mAmp = Math.abs(marginStretch)
      const mRatio = Math.min(1, mAmp / this._marginMax)
      const antiMargin = Math.pow(mRatio, 1.3) * this._marginMax * 0.75 * mSign
      this.innerPos = this._innerPosVirtual - antiMargin
    } else {
      this.innerPos = this._innerPosVirtual
    }
  }

  animateToEnd() {
    if (this._outerSize < this._innerSize) {
      const animVal = { value: 0 }
      const initScrollPos = this.innerPos
      const potentialNewPos = this._outerSize - this._innerSize
      if (initScrollPos - potentialNewPos > EDGE_TOLERANCE) {
        let brakeEngaged = false
        simpleTweener.to({
          description: 'scroll action history to bottom',
          target: animVal,
          propertyGoals: { value: 1 },
          duration: 1000,
          easing: Easing.Custom.RoundedOutHard,
          onUpdate: () => {
            if (this.braking) {
              brakeEngaged = true
            }
            if (!brakeEngaged) {
              this.setPosition(
                lerp(
                  initScrollPos,
                  this._outerSize - this._innerSize,
                  animVal.value
                )
              )
            }
          }
        })
      }
    }
  }
}
