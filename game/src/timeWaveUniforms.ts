import { wrap } from '@opensky/shared/utils/math'
import { Uniform, Vector3 } from 'three'

const __halfPI = Math.PI * 0.5
export class TimeWaveUniformHelper {
  uniform: Uniform
  count = 0
  time = 0
  value: Vector3
  setFrequency(freq: number) {
    this._frequency = freq
  }
  constructor(
    private _frequency: number,
    private _amplitude: number,
    private _phaseOffset = __halfPI
  ) {
    const val = new Vector3()
    this.uniform = new Uniform(val)
    this.value = val
  }
  update(dt: number) {
    this.time += dt * this._frequency
    const circleTime = this.time * Math.PI * 2
    this.value.x = Math.cos(circleTime) * this._amplitude
    this.value.y = Math.cos(circleTime + this._phaseOffset) * this._amplitude
    this.value.z = wrap(this.time, 0, 1)
  }
}

class TimeWaveUniformFactory {
  private _helpersByFrequencyAndAmplitude = new Map<
    number | string,
    Map<number, TimeWaveUniformHelper>
  >()
  private _helpers: TimeWaveUniformHelper[] = []
  getUniformHelper(
    frequency: number,
    amplitude: number,
    phaseOffset = __halfPI,
    suffixOverride?: string
  ) {
    let helpersByAmplitude = this._helpersByFrequencyAndAmplitude.get(
      suffixOverride || frequency
    )
    if (!helpersByAmplitude) {
      helpersByAmplitude = new Map<number, TimeWaveUniformHelper>()
      this._helpersByFrequencyAndAmplitude.set(frequency, helpersByAmplitude)
    }
    let helper = helpersByAmplitude.get(amplitude)
    if (!helper) {
      helper = new TimeWaveUniformHelper(frequency, amplitude, phaseOffset)
      helpersByAmplitude.set(frequency, helper)
      this._helpers.push(helper)
    }
    helper.count++
    return helper
  }
  getUniform(
    frequency: number,
    amplitude: number,
    phaseOffset = __halfPI,
    keyOverride?: string
  ) {
    return this.getUniformHelper(frequency, amplitude, phaseOffset, keyOverride)
      .uniform
  }
  // releaseUniform is actually broken, but not used, so not a problem right now
  // releaseUniform(uniform: Uniform) {
  //   const frequency = uniform.value
  //   const helper = this._helpersByFrequencyAndAmplitude.get(frequency)!.get(amplitude)!
  //   if (helper) {
  //     helper.count--
  //     if (helper.count === 0) {
  //       this._helpersByFrequencyAndAmplitude.delete(frequency)
  //     }
  //   }
  // }
  update(dt: number) {
    for (const helper of this._helpers) {
      helper.update(dt)
    }
  }
}

export const timeWaveUniformFactory = new TimeWaveUniformFactory()
