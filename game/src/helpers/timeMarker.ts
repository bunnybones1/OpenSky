import { removeFromArray } from '@opensky/shared/utils/arrayUtils'

import { trackBatchedGameEvent } from './batchTracker'
import { TimeMarkReport } from './TimeMarkReport'

function t(ms: number) {
  return parseFloat((ms * 0.001).toFixed(2))
}

export class TimeMark {
  state: 'pending' | 'complete' = 'pending'
  timeStart = performance.now()
  timeEnd: number | undefined
  constructor(
    public label: string,
    private _timeMarker: TimeMarker,
    private _sendAnalytics = true
  ) {
    if (_sendAnalytics) {
      trackBatchedGameEvent(
        new TimeMarkReport(this.label, 'start', t(this.timeStart))
      )
    }
  }
  complete() {
    this.timeEnd = performance.now()
    this.state = 'complete'
    this._timeMarker.releaseTimeMark(this)
    if (this._sendAnalytics) {
      trackBatchedGameEvent(
        new TimeMarkReport(this.label, 'end', t(this.timeEnd))
      )
    }
  }
  get summary() {
    return `${(this.timeStart * 0.001).toFixed(2).padStart(7)}s ${
      this.label
    } - ${this.state} ${(
      ((this.timeEnd !== undefined ? this.timeEnd! : performance.now()) -
        this.timeStart) *
      0.001
    ).toFixed(2)}s `
  }
}

type TMCallback = (tm: TimeMark) => void

let __timeMarker: TimeMarker | undefined
export function getTimeMarker() {
  if (!__timeMarker) {
    __timeMarker = new TimeMarker()
  }
  return __timeMarker
}

export class TimeMarker {
  private _registry: TimeMark[] = []
  private _registryFinished: TimeMark[] = []

  private _listeners: TMCallback[] = []
  listenForMarkedTimes(callback: TMCallback, catchup = true) {
    if (this._listeners.includes(callback)) {
      return
    }
    this._listeners.push(callback)
    if (catchup) {
      for (const tm of this._registry) {
        callback(tm)
      }
    }
  }
  stopListeningForMarkedTimes(callback: TMCallback) {
    removeFromArray(this._listeners, callback)
  }

  instantTimeMark(label: string) {
    const tm = this.startTimeMark(label)
    this.releaseTimeMark(tm)
  }

  startTimeMark(label: string, sendAnalytics = true) {
    const tm = new TimeMark(label, this, sendAnalytics)
    this._registry.push(tm)
    for (const listener of this._listeners) {
      listener(tm)
    }
    return tm
  }

  releaseTimeMark(tm: TimeMark) {
    this._registryFinished.push(tm)
  }

  reportMarkedTimes() {
    let report = 'reporting marked times:'
    for (const mt of this._registry) {
      report += '\n' + mt.summary
    }
    return report
  }

  getUnfinishedMarkedTimes() {
    return this._registry.filter(tm => !this._registryFinished.includes(tm))
  }

  logUnfinishedMarkedTimes() {
    console.log('reporting unfinished marked times:')
    for (const tm of this.getUnfinishedMarkedTimes()) {
      console.log(tm.summary)
    }
  }

  reportUnfinishedMarkedTimes() {
    let report = 'reporting unfinished marked times:'
    for (const tm of this.getUnfinishedMarkedTimes()) {
      report += '\n' + tm.summary
    }
    return report
  }
}
