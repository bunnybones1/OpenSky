import { CardEvent, SkyWeaver } from '@skyweaver/state-metadata'

import { Collection } from '../AnimationOrchestrator'

export default class PromiseParallel<
  CE extends CardEvent<SkyWeaver> | undefined
> implements Collection<CE>
{
  isExecuting: false | Promise<any> = false
  private _alreadyRan: Array<Promise<any>> = []
  private _queue: Array<() => any> = []
  private _started: boolean = false
  private _shouldFinish: boolean = false
  private _finish: () => void
  private _finishedPromise: Promise<void> = new Promise(resolve => {
    this._finish = resolve
  })
  constructor(
    private onError: (err: any) => void,
    public cardEvent?: CE
  ) {}

  runUntilFinished() {
    this._started = true
    this._next()
    return this._finishedPromise
  }

  push<T>(fn: () => T | Promise<T>) {
    const run = async () => {
      try {
        await fn()
      } catch (err) {
        this.onError(err)
      }
      this._next()
    }

    this._queue.push(run)
    this._next()
  }

  finish() {
    this._shouldFinish = true
    this._next()
  }

  cancel() {
    this._queue = []
  }

  private _next() {
    if (!this._started) {
      return
    }
    for (const task of this._queue) {
      this._alreadyRan.push(task())
    }
    this.isExecuting = Promise.all(this._alreadyRan)
    if (this._shouldFinish) {
      this.isExecuting.then(this._finish)
    }
    this._queue = []
  }
}
