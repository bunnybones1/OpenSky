import { CardEvent, SkyWeaver } from '@skyweaver/state-metadata'

import { Collection } from '../AnimationOrchestrator'

export default class PromiseQueue<CE extends CardEvent<SkyWeaver> | undefined>
  implements Collection<CE>
{
  isExecuting: false | Promise<any> = false

  private _queue: Array<() => any> = []
  private _started: boolean = false
  private _finish: () => void
  private _finishedPromise: Promise<void> = new Promise(resolve => {
    this._finish = resolve
  })
  constructor(
    private onError: (err: any) => void,
    public cardEvent?: CE,
    private _onFinishedLastQueueItem?: () => void
  ) {}

  runUntilFinished() {
    this._started = true
    this._next()
    return this._finishedPromise
  }

  push<T>(fn: () => T | Promise<T>) {
    const run = () => {
      try {
        const result = fn()
        if (result instanceof Promise) {
          this.isExecuting = result.then(
            () => {
              this.isExecuting = false
              this._next()
            },
            err => {
              this.onError(err)
              this.isExecuting = false
              this._next()
            }
          )
        } else {
          this.isExecuting = false
          this._next()
        }
      } catch (err) {
        this.onError(err)
        this.isExecuting = false
        this._next()
      }
    }
    this._queue.push(run)
    this._next()
  }

  finish() {
    this.push(this._finish)
  }

  cancel() {
    this._queue = []
  }

  hasUnexecutedPromises() {
    return this._queue.length > 0
  }

  private _next() {
    if (this.isExecuting || !this._started) {
      return
    }
    const firstQueueTask = this._queue.shift()
    if (firstQueueTask) {
      firstQueueTask()
    } else if (this._onFinishedLastQueueItem) {
      this._onFinishedLastQueueItem()
    }
  }
}
