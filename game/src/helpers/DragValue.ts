const MAX_DURATION_FOR_VELOCITY_CALCULATION = 500

export default class DragValue {
  referenceValue = 0
  value = 0
  active: boolean
  historicValues: number[]
  historicTimes: number[]
  historyLength = 0
  historyIndex = 0
  speedPPS: number
  constructor(private _historyLengthMax = 6) {
    this.historicValues = new Array(_historyLengthMax)
    this.historicTimes = new Array(_historyLengthMax)
  }
  start(value: number) {
    this.active = true
    this.historyIndex = 0
    this.historyLength = 0
    this.referenceValue = value
    this.update(value)
  }
  update(value: number) {
    this.value = value
    this.historicValues[this.historyIndex] = value
    this.historicTimes[this.historyIndex] = performance.now()
    this.historyIndex = (this.historyIndex + 1) % this._historyLengthMax
    this.historyLength = Math.min(
      this.historyLength + 1,
      this._historyLengthMax
    )
  }
  drain() {
    const delta = this.value - this.referenceValue
    this.referenceValue = this.value
    return delta
  }
  stop(value: number) {
    this.update(value)
    this.active = false

    if (this.historyLength < 2) {
      return
    }

    const hLen = this.historyLength
    const hMax = this._historyLengthMax
    const hTimes = this.historicTimes
    const hValues = this.historicValues

    let speed = 0
    const now = performance.now()
    let validSamples = 0

    for (let i = 1; i < hLen; i++) {
      const index = (this.historyIndex - hLen + i + hMax) % hMax

      const prevIndex = (index - 1 + hMax) % hMax

      const howLongAgo = now - hTimes[index]

      if (howLongAgo < MAX_DURATION_FOR_VELOCITY_CALCULATION) {
        const timeDelta = hTimes[index] - hTimes[prevIndex]

        if (timeDelta > 0) {
          const valueDelta = hValues[index] - hValues[prevIndex]

          speed += valueDelta / timeDelta
          validSamples++
        }
      }
    }
    if (validSamples > 0) {
      this.speedPPS = (speed / validSamples) * 1000 //1000ms = 1s
    } else {
      this.speedPPS = 0
    }
  }
}
