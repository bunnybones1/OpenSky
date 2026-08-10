import { RESET_USER_SETTINGS_TO_DEFAULTS } from '@opensky/shared/userSettings'
import { distributions } from '@opensky/shared/utils/distributions'
import { clamp, lerp } from '@opensky/shared/utils/math'
import NiceFloatParameter from '@opensky/shared/utils/NiceFloatParameter'

import { SHOW_ANIM_SPEED_SETTINGS_UI } from '~/constants'

const BULLET_TIME_SPEED = 0.025
const TIME_CHANGE_DURATION = 0.05

class TimeWarp {
  private time: number = 0
  private timers: number[] = []
  private _bulletTimeStrength: number = 0
  private _timeScale: number = 1
  private customScalers: { [key: string]: number } = {}
  speed: number = 1

  update(dt: number) {
    this.time += dt

    while (this.timers.length > 0 && this.timers[0] <= this.time) {
      this.timers.shift()
    }

    this.bulletTimeStrength =
      this._bulletTimeStrength +
      (dt / TIME_CHANGE_DURATION) * (this.timers.length > 0 ? 2 : -1)
  }

  add(duration: number) {
    this.timers.push(this.time + duration)
    this.timers.sort()
  }

  setCustomScaler(key: string, value: number) {
    this.customScalers[key] = value
    this.updateTimeSpeed()
  }

  removeCustomScaler(key: string) {
    delete this.customScalers[key]
    this.updateTimeSpeed()
  }

  removeCustomScalersThatStartWith(prefix: string) {
    const keys = Object.keys(this.customScalers).filter(k =>
      k.startsWith(prefix)
    )
    for (const key of keys) {
      delete this.customScalers[key]
    }
    this.updateTimeSpeed()
  }

  private updateTimeSpeed() {
    const customScale = Object.values(this.customScalers).reduce(
      (acc, curr) => acc + curr - 1,
      1
    )
    this.speed =
      lerp(1, BULLET_TIME_SPEED, this._bulletTimeStrength) *
      this._timeScale *
      customScale
  }

  private set bulletTimeStrength(value: number) {
    value = clamp(value, 0, 1)

    if (value === this._bulletTimeStrength) {
      return
    }

    this._bulletTimeStrength = value
    this.updateTimeSpeed()
  }

  get timeScale(): number {
    return this._timeScale
  }

  set timeScale(value: number) {
    value = clamp(value, 0, 10)

    if (value === this._timeScale) {
      return
    }

    this._timeScale = value
    this.updateTimeSpeed()
  }
}

export const timeWarp = new TimeWarp()

const animSpeed = new NiceFloatParameter(
  'debug-anim-speed',
  'Animation Speed',
  1,
  0.01,
  4,
  distributions.quadratic,
  v => ~~(v * 100) + '%',
  SHOW_ANIM_SPEED_SETTINGS_UI ? 'user' : 'secret',
  RESET_USER_SETTINGS_TO_DEFAULTS
)

animSpeed.listen(value => (timeWarp.timeScale = value))
