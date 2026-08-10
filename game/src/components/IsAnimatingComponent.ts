import { Component, Entity } from 'gg'

import { AnimatedObject, CompleteStatus } from '~/systems/animation/RawTweener'
import { nullAnimation } from '~/utils/asyncUtils'
import { TrackableCollection } from '~/utils/TrackableCollection'

import { Components } from '.'

type AnimationCallback = (
  entity: Entity<Components>,
  completeStatus: CompleteStatus
) => void

export class IsAnimating {
  private _timeoutId: NodeJS.Timeout | undefined
  animationManditoryMinimum: AnimatedObject<any>
  finishedFull: Promise<CompleteStatus>
  finishedManditoryMinimum: Promise<CompleteStatus>
  private _callbacks: Set<AnimationCallback> = new Set()
  isStarted = false
  result: CompleteStatus

  constructor(
    public description: string,
    public animationFull: AnimatedObject<any>,
    manditoryMinimumRatio = 1,
    public cancellable = false,
    public isTransformAnimation = true
  ) {
    this.finishedFull = animationFull.finished
    this.animationManditoryMinimum =
      manditoryMinimumRatio === 1
        ? animationFull
        : nullAnimation(animationFull.duration * manditoryMinimumRatio)
    this.finishedManditoryMinimum = this.animationManditoryMinimum.finished
    this._timeoutId = setTimeout(this.timeoutError, 120000)
  }

  timeoutError = () => {
    throw new Error(`Animation seems to have timed out (${this.description})`)
  }

  onComplete(cb: AnimationCallback) {
    this._callbacks.add(cb)
  }

  cancel() {
    if (this.result !== CompleteStatus.Finished && !this.cancellable) {
      throw new Error(`This animation is not cancellable (${this.description})`)
    }

    if (this.animationManditoryMinimum !== this.animationFull) {
      this.animationManditoryMinimum.kill()
    }
    this.animationFull.kill()
  }

  async start(entity: Entity<Components>) {
    if (this.isStarted) {
      throw new Error(`Animation already started (${this.description})`)
    }
    this.isStarted = true
    this.result = await this.finishedFull
    if (entity.has('isAnimating') && entity.get('isAnimating') === this) {
      entity.remove('isAnimating')
    }
    if (this._timeoutId !== undefined) {
      clearTimeout(this._timeoutId)
      this._timeoutId = undefined
    }
    for (const cb of this._callbacks) {
      cb(entity, this.result)
    }
  }
}

export default class IsAnimatingComponent extends Component<IsAnimating> {
  static entities = new TrackableCollection<Entity<Components>>(
    'IsAnimatingComponent'
  )
  onComponentDetach: Promise<CompleteStatus>
  private _resolveOnComponentDetach: (status: CompleteStatus) => void
  constructor(
    description: string,
    animatedObject: AnimatedObject<any>,
    manditoryMinimumRatio = 1,
    cancellable = false,
    isTransformAnimating = true
  ) {
    super(
      new IsAnimating(
        description,
        animatedObject,
        manditoryMinimumRatio,
        cancellable,
        isTransformAnimating
      )
    )
    this.onComponentDetach = new Promise(
      resolve => (this._resolveOnComponentDetach = resolve)
    )
  }
  onAttach(entity: Entity<Components>) {
    IsAnimatingComponent.entities.add(entity)
    this.value.start(entity)
  }

  onDetach(entity: Entity<Components>) {
    this._resolveOnComponentDetach(this.value.result)
    IsAnimatingComponent.entities.remove(entity)
  }
}
