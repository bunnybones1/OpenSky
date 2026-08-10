import { Component, Entity } from 'gg'

import { Components } from '.'

class IsBeingDamaged {
  _promise: Promise<void>
  _lastKey: number

  constructor(private _entity: Entity<Components>) {
    this._promise = Promise.resolve()
    this._lastKey = 0
  }

  queueNext(fn: () => Promise<any>) {
    const key = Math.random()
    this._lastKey = key
    this._promise = this._promise.then(fn).then(() => {
      if (
        this._lastKey === key &&
        this._entity.has('isBeingDamaged') &&
        this._entity.get('isBeingDamaged') === this
      ) {
        this._entity.remove('isBeingDamaged')
      }
    })
  }

  get promise() {
    return this._promise
  }
}

export default class IsBeingDamagedComponent extends Component<IsBeingDamaged> {
  constructor(entity: Entity<Components>) {
    super(new IsBeingDamaged(entity))
  }
}
