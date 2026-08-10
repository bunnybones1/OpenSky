import { lerp } from '@opensky/shared/utils/math'

import { copyDefaults } from '~/utils/jsUtils'

import { Easing } from './Easing'

export type NumberEaser = (v: number) => number

interface TweenParams<T extends object> extends Optional {
  target: T
  propertyInitialValues?: Partial<{
    [K in keyof T]: T[K] extends number ? number : never
  }>
  propertyGoals: Partial<{
    [K in keyof T]: T[K] extends number ? number : never
  }>
}

interface Optional {
  description: string
  delay?: number
  duration?: number
  easing?: NumberEaser
  onUpdate?: UpdateCallback
  onComplete?: CompleteCallback
}

const __defaultOptions: Optional = {
  description: 'unnamed',
  delay: 0,
  duration: 1000,
  easing: Easing.Linear
}

const __animationsToKill: AnimatedObject<any>[] = []

export enum CompleteStatus {
  Killed,
  Finished,
  NothingChanged
}

export const CompleteStatusNameLookup = {
  0: 'Killed',
  1: 'Finished',
  2: 'NothingChanged'
}

type UpdateCallback = (dt: number, progress: number) => void
type CompleteCallback = (status: CompleteStatus) => void

let __id = 0

function log(event: string, anim: AnimatedObject<any>) {
  // console.log(`[RawTweener] ${event} ${anim.description}`)
  void event
  void anim
}

export class AnimatedObject<T extends object> {
  readonly duration: number
  onComplete: CompleteCallback
  finished: Promise<CompleteStatus>
  inDelay = false
  id = __id++
  updateCallbacks: Set<UpdateCallback> = new Set()
  constructor(
    readonly tweener: RawTweener,
    readonly target: Partial<{
      [K in keyof T]: T[K] extends number ? number : never
    }>,
    readonly initialValues: Partial<{
      [K in keyof T]: T[K] extends number ? number : never
    }>,
    readonly valueGoals: Partial<{
      [K in keyof T]: T[K] extends number ? number : never
    }>,
    readonly animatedPropertyKeys: Array<keyof T>,
    readonly easing: NumberEaser,
    readonly startTime: number,
    readonly endTime: number,
    onUpdate?: UpdateCallback,
    onComplete?: CompleteCallback,
    public description = ''
  ) {
    this.duration = endTime - startTime
    this.finished = new Promise(resolve => {
      this.onComplete = (status: CompleteStatus) => {
        resolve(status)
        if (onComplete) {
          onComplete(status)
        }
      }
    })
    if (onUpdate) {
      this.updateCallbacks.add(onUpdate)
    }
  }
  kill() {
    this.tweener.kill(this)
  }
  finishEarly() {
    this.tweener.finishEarly(this)
  }
  onUpdate(dt: number, progress: number) {
    this.updateCallbacks.forEach(c => c(dt, progress))
  }
  addUpdateListener(cb: UpdateCallback): () => void {
    this.updateCallbacks.add(cb)
    return () => this.updateCallbacks.delete(cb)
  }
}

export class RawTweener {
  protected _now = 0
  private _processingTick = false
  private _animations: Set<AnimatedObject<any>> = new Set()
  private _animationsToComplete: AnimatedObject<any>[] = []

  to<T extends object>(params: TweenParams<T>) {
    this.killTweensOf(params.target)
    copyDefaults(params, __defaultOptions)

    if (typeof params.easing !== 'function') {
      throw new Error(
        'ease must be an easing function that takes in a number (0..1) and returns a number (0..1)'
      )
    }

    const { target, propertyGoals } = params
    const animatedPropertyKeys: Array<keyof T> = []

    for (const key of Object.keys(propertyGoals) as Array<keyof T>) {
      const numFrom = target[key] as unknown as number
      const numTo = propertyGoals[key] as number

      if (!isNaN(numFrom) && !isNaN(numTo)) {
        animatedPropertyKeys.push(key)
      } else {
        throw new Error('values must be numbers')
      }
    }

    const startTime = this._now + params.delay!
    const endTime = startTime + params.duration!
    if (!params.propertyInitialValues) {
      const initialValues = {} as any
      for (const key of animatedPropertyKeys) {
        initialValues[key] = target[key]
      }
      params.propertyInitialValues = initialValues
    }
    const animation = new AnimatedObject(
      this,
      target,
      params.propertyInitialValues!,
      propertyGoals,
      animatedPropertyKeys,
      params.easing!,
      startTime,
      endTime,
      params.onUpdate,
      params.onComplete,
      params.description
    )

    this._animations.add(animation)
    log('starting', animation)

    // if (!params.delay && animation.onUpdate) {
    //   animation.onUpdate(0.00001, 0)
    // }

    return animation
  }

  tick(dt: number) {
    this._now += dt
    this._processingTick = true

    const now = this._now
    const animations = this._animations

    for (const animation of animations) {
      const { startTime, duration, target, valueGoals, initialValues } =
        animation

      if (now > startTime) {
        animation.inDelay = false
        const progress = Math.min((now - startTime) / duration, 1)

        const mix = animation.easing(progress)

        for (const key of animation.animatedPropertyKeys) {
          //@ts-ignore
          target[key] = lerp(initialValues[key]!, valueGoals[key]!, mix)
        }

        if (animation.onUpdate) {
          animation.onUpdate(dt, mix)
        }

        if (progress === 1) {
          this._animationsToComplete.push(animation)
        }
      }
    }

    this._processingTick = false

    if (this._animationsToComplete.length > 0) {
      for (const animation of this._animationsToComplete) {
        this.finish(animation)
      }

      this._animationsToComplete.length = 0
    }
  }

  finishEarly(animation: AnimatedObject<any>) {
    if (!this._animations.has(animation)) {
      return
    }

    for (const key of animation.animatedPropertyKeys) {
      //@ts-ignore
      animation.target[key] = animation.valueGoals[key]
    }

    if (animation.onUpdate) {
      animation.onUpdate(1 / 60, 1)
    }

    this.finish(animation)
  }

  killTweensOf(target: any) {
    if (this._processingTick) {
      throw new Error('Not allowed during processing of tick')
    }

    for (const animation of this._animations) {
      if (animation.target === target) {
        __animationsToKill.push(animation)
      }
    }

    if (__animationsToKill.length > 0) {
      for (const animation of __animationsToKill) {
        this.kill(animation)
      }
      __animationsToKill.length = 0
    }
  }

  kill(animation: AnimatedObject<any>) {
    if (this._processingTick) {
      throw new Error('Not allowed during processing of tick')
    }

    if (this._animations.has(animation)) {
      animation.description += ' killed'
      if (animation.onUpdate) {
        animation.onUpdate(0.00001, 1)
      }
      if (animation.onComplete) {
        log('killing', animation)
        animation.onComplete(CompleteStatus.Killed)
      }

      this._animations.delete(animation)
    }
  }
  private finish(animation: AnimatedObject<any>) {
    if (this._processingTick) {
      throw new Error('Not allowed during processing of tick')
    }

    if (animation.onComplete) {
      animation.onComplete(CompleteStatus.Finished)
    }

    this._animations.delete(animation)
  }
  isAnimating(target: any) {
    for (const animation of this._animations) {
      if (animation.target === target) {
        return true
      }
    }
    return false
  }
}
