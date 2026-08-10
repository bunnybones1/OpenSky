import { wrap } from '@opensky/shared/utils/math'
import { Uniform, Vector2 } from 'three'
class Time2UniformHelper {
  uniform: Uniform
  count = 0
  time = 0
  time2 = 0
  constructor(
    private _speed: number,
    private _speed2: number
  ) {
    this.uniform = new Uniform(new Vector2(0, 0))
  }
  update(dt: number) {
    this.time += dt * this._speed
    this.time2 += dt * this._speed2
    this.uniform.value.set(
      wrap(this.time, -2.0, 2.0),
      wrap(this.time2, -2.0, 2.0)
    )
  }
}

class Time2UniformFactory {
  private _helpersBySpeed = new Map<string, Time2UniformHelper>()
  private _helpers: Time2UniformHelper[] = []
  getUniformHelper(speed: number, speed2: number) {
    const key = `${speed}:${speed2}`
    if (!this._helpersBySpeed.has(key)) {
      const helper = new Time2UniformHelper(speed, speed2)
      this._helpersBySpeed.set(key, helper)
      this._helpers.push(helper)
    }
    const helper = this._helpersBySpeed.get(key)!
    helper.count++
    return helper
  }
  getUniform(speed: number, speed2: number) {
    return this.getUniformHelper(speed, speed2).uniform
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

export const time2UniformFactory = new Time2UniformFactory()
