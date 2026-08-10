import { getClampedIndex } from '@opensky/shared/utils/arrayUtils'
import { delayPromise } from '@opensky/shared/utils/async'

import { AssetsManager } from '.'

const ATTEMPTS = 15
const ATTEMPT_COOLDOWNS = [1, 2, 3, 4, 5]

export function sortAssetLoadTasks(
  a: AssetLoadTask<any>,
  b: AssetLoadTask<any>
) {
  return a.score - b.score
}

export default class AssetLoadTask<T> {
  definitelyFailed: boolean
  get success() {
    return this._success
  }
  private set timeRequested(val: number) {
    this._timeRequested = val
    this._updateScore()
  }
  private set priority(val: number) {
    this._priority = val
    this._updateScore()
  }
  get score() {
    return this._score
  }
  finished: Promise<T>
  private _attemptsMade = 0
  private _reattemptMode = false
  private _success = false
  private _lastFailReason: any
  private _timeRequested: number = performance.now() * 0.001
  private _resolve: (value?: T | PromiseLike<T> | undefined) => void
  private _reject: (reason?: any) => void
  private _score: number = 0
  constructor(
    private _assetsMan: AssetsManager,
    private _assetLoader: (url: string) => Promise<T>,
    private _url: string,
    private _priority: number,
    private _errorHandler: (error: any, url: string) => void,
    private _maxRetryAttempts: number = ATTEMPTS
  ) {
    this._updateScore()
    const persistantPromise = new Promise<T>((resolve, reject) => {
      this._resolve = resolve
      this._reject = reject
    })
    this.finished = persistantPromise.catch(err =>
      this._errorHandler(err, this._url)
    ) as Promise<T>
  }
  async attempt() {
    if (!this._success && this._attemptsMade < this._maxRetryAttempts) {
      this._attemptsMade++
      // console.log(`attempting ${this._url} #${this._attemptsMade}`)
      await this._assetLoader(this._url)
        .then(v => {
          this._success = true
          this._lastFailReason = undefined
          // console.log(`succeeded ${this._url} #${this._attemptsMade}`)
          this._resolve(v)
        })
        .catch(reason => {
          this._lastFailReason = reason
          this.priority--
          this.timeRequested = performance.now() * 0.001
          // console.warn(
          //   `${this._url} possibly unreachable. ${
          //     this._maxRetryAttempts - this._attemptsMade
          //   } attempts left.`
          // )
        })
      if (this._success) {
        if (this._reattemptMode) {
          this._assetsMan.assetsInReattemptMode--
        }
      } else {
        if (!this._reattemptMode) {
          this._reattemptMode = true
          this._assetsMan.assetsInReattemptMode++
        } else {
          this._assetsMan.assetsInReattemptMode--
          this._assetsMan.assetsInReattemptMode++
        }
        await delayPromise(
          getClampedIndex(ATTEMPT_COOLDOWNS, this._attemptsMade - 1) * 1000
        )
      }
    }
    if (this._lastFailReason && this._attemptsMade >= this._maxRetryAttempts) {
      this.definitelyFailed = true
      this._reject(this._lastFailReason)
    }
  }
  private _updateScore() {
    this._score = this._timeRequested - this._priority * 100
  }
}
