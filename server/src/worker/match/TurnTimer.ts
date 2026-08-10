type Callback = () => void

export default class TurnTimer {
  timer: NodeJS.Timeout
  finished: boolean
  callback: Callback
  maxTime: number
  startTime: number

  constructor(callback: Callback, time: number) {
    this.maxTime = time
    this.setTimeout(callback, time)
  }

  setTimeout = (callback: Callback, time: number, extend = false) => {
    clearTimeout(this.timer)
    this.finished = false

    if (!extend) {
      this.callback = callback
      this.startTime = Date.now()
    }

    this.timer = global.setTimeout(() => {
      this.finished = true
      callback()
    }, time)
  }

  add = (time: number) => {
    if (!this.finished) {
      const now = Date.now()

      // Cap time to maxTime
      const elapsed = now - this.startTime
      const newTimeLeft = Math.min(this.maxTime - elapsed + time, this.maxTime)
      // offset new startTime, relative to now
      this.startTime = Math.min(this.startTime + time, now)

      // reset timer
      this.setTimeout(this.callback, newTimeLeft, true)
    }
  }

  kill = () => {
    clearTimeout(this.timer)
  }

  get remaining(): number {
    return this.maxTime - (Date.now() - this.startTime)
  }

  get endTime(): number {
    return this.startTime + this.maxTime
  }
}
