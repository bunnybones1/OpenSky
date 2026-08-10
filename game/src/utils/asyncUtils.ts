import { simpleTweener } from '~/systems/animation/tweeners'

import { onNextFrame } from './onNextFrame'
import { taskTimer } from './taskTimer'

export async function promiseAllWithProgress(
  iterable: Iterable<Promise<any>>,
  progressCallback: (progress: ProgressEvent) => void
) {
  await Promise.resolve() // don't resolve synchronously ever
  const promises = Array.from(iterable).map(Promise.resolve.bind(Promise))
  const total = promises.length
  let loaded = 0
  const values = promises.map(async promise => {
    const value = await promise
    const event = new ProgressEvent('progress', {
      total,
      loaded: ++loaded
    })

    progressCallback(event)

    return value
  })
  await Promise.all(values)
  // fire once for 100%
  progressCallback(
    new ProgressEvent('progress', {
      total,
      loaded: total
    })
  )
}

export function animationDelay(ms: number) {
  return new Promise(resolve =>
    simpleTweener.to({
      description: 'animation delay',
      target: {},
      propertyGoals: {},
      duration: ms,
      onComplete: resolve
    })
  )
}

export function nullAnimation(ms: number) {
  return simpleTweener.to({
    description: 'null animation',
    target: {},
    propertyGoals: {},
    duration: ms
  })
}

export function preciseDelay(ms: number, startOnNextFrame = false) {
  return new Promise<void>(resolve => {
    const startTimer = () => {
      taskTimer.add(() => {
        resolve()
      }, ms * 0.001)
    }
    if (startOnNextFrame) {
      onNextFrame(startTimer)
    } else {
      startTimer()
    }
  })
}

// An empty Promise that exposes a resolve function
// Useful for creating an awaitable Promise flag that you can
// resolve from the outside
export interface Resolvable<T extends void> extends Promise<T> {
  status: { type: 'pending' | 'resolved' }
  isResolved: boolean
  resolve: () => void
}

export const createResolvable = () => {
  const status: { type: 'pending' | 'resolved' } = { type: 'pending' }
  let resolver: any
  const resolvable = new Promise<void>(resolve => {
    resolver = () => {
      status.type = 'resolved'
      resolve()
    }
  })
  ;(resolvable as any).resolve = resolver
  ;(resolvable as any).status = status
  Object.defineProperty(resolvable, 'isResolved', {
    get() {
      return status.type === 'resolved'
    }
  })

  return resolvable as any as Resolvable<void>
}

export class TimeoutHelper {
  private _timeoutId: NodeJS.Timeout | undefined
  constructor(
    private description: string,
    duration = 10000
  ) {
    this._timeoutId = setTimeout(this.timeoutError, duration)
  }

  timeoutError = () => {
    throw new Error('timed out: ' + this.description)
  }

  complete() {
    if (this._timeoutId !== undefined) {
      clearTimeout(this._timeoutId)
      this._timeoutId = undefined
    }
  }
}

export function debounce<T, F extends (...args: any) => any>(
  this: T,
  func: F,
  timeout = 300
) {
  let timer: NodeJS.Timeout
  return (...args: Parameters<F>) => {
    clearTimeout(timer)
    timer = setTimeout(() => func.apply(this, args), timeout)
  }
}
