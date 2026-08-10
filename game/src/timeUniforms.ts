import { wrap } from '@opensky/shared/utils/math'
import { Uniform } from 'three'

export class TimeUniformHelper {
  uniform: Uniform
  count = 0
  time = 0
  constructor(private _speed: number) {
    this.uniform = new Uniform(0)
  }
  update(dt: number) {
    this.time += dt * this._speed
    this.uniform.value = wrap(this.time, -2.0, 2.0)
  }
  realTimeToAttribute(time: number, dt: number) {
    return wrap(time + dt * this._speed, -2.0, 2.0)
  }
}

class TimeUniformFactory {
  private _helpersBySpeed = new Map<number, TimeUniformHelper>()
  private _helpers: TimeUniformHelper[] = []
  getUniformHelper(speed: number) {
    if (!this._helpersBySpeed.has(speed)) {
      const helper = new TimeUniformHelper(speed)
      this._helpersBySpeed.set(speed, helper)
      this._helpers.push(helper)
    }
    const helper = this._helpersBySpeed.get(speed)!
    helper.count++
    return helper
  }
  getUniform(speed: number) {
    return this.getUniformHelper(speed).uniform
  }
  // releaseUniform is actually broken, but not used, so not a problem right now
  // releaseUniform(uniform: Uniform) {
  //   const speed = uniform.value
  //   const helper = this._helpersBySpeed.get(speed)
  //   if (helper) {
  //     helper.count--
  //     if (helper.count === 0) {
  //       this._helpersBySpeed.delete(speed)
  //     }
  //   }
  // }
  update(dt: number) {
    for (const helper of this._helpers) {
      helper.update(dt)
    }
  }
}

export const timeUniformFactory = new TimeUniformFactory()

export const standardTimeUniform = timeUniformFactory.getUniform(1)
