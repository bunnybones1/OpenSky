import { Component, Entity } from 'gg'
import { Vector3 } from 'three'

import { Pin } from '~/helpers/LayoutHelpers'
import { TrackableCollection } from '~/utils/TrackableCollection'

import { Components } from '.'
const __origin = new Vector3()
export class GamePinCushion {
  private _pinCounts = new Map<Vector3, number>()
  private _pins = new Map<Vector3, Pin>()
  getPin(offset = __origin) {
    if (this._pins.has(offset)) {
      this._pinCounts.set(offset, this._pinCounts.get(offset)! + 1)
      return this._pins.get(offset)!
    } else {
      const pin = new Pin(0, 0)
      this._pinCounts.set(offset, 1)
      this._pins.set(offset, pin)
      return pin
    }
  }
  releasePin(offset = __origin) {
    if (!this._pinCounts.has(offset)) {
      throw new Error('wtf')
    }
    const count = this._pinCounts.get(offset)! - 1
    if (count === 0) {
      this._pinCounts.delete(offset)
      this._pins.delete(offset)
    } else {
      this._pinCounts.set(offset, count)
    }
  }
  isEmpty() {
    return this._pins.size === 0
  }
  forEach(cb: (pin: Pin, offset: Vector3) => void) {
    this._pins.forEach(cb)
  }
  constructor() {
    //
  }
}

function __makePin(entity: Entity<Components>) {
  const comp = new GamePinCushionComponent(__preventativeSecret)
  entity.add(comp)
  return comp.value
}

const __preventativeSecret = '21n438sjn2nf72hj1'
export default class GamePinCushionComponent extends Component<GamePinCushion> {
  static getPin(entity: Entity<Components>, offset: Vector3 = __origin) {
    const gamePinCushion = entity.has('gamePinCushion')
      ? entity.get('gamePinCushion')
      : __makePin(entity)
    return gamePinCushion.getPin(offset)
  }
  static releasePin(entity: Entity<Components>, offset = __origin) {
    const gamePinCushion =
      entity.has('gamePinCushion') && entity.get('gamePinCushion')
    if (gamePinCushion) {
      gamePinCushion.releasePin(offset)
      if (gamePinCushion.isEmpty()) {
        entity.remove('gamePinCushion')
      }
    } else {
      console.error('tried to release pin that was already released!')
    }
  }

  static entities = new TrackableCollection<Entity<Components>>(
    'GamePinComponent'
  )
  constructor(preventativeSecret: string) {
    super(new GamePinCushion())
    if (preventativeSecret !== __preventativeSecret) {
      throw new Error(
        'do not instantiate these manually. Use the static methods getPin and releasePin.'
      )
    }
  }
  onAttach(entity: Entity<Components>) {
    GamePinCushionComponent.entities.add(entity)
  }
  onDetach(entity: Entity<Components>) {
    GamePinCushionComponent.entities.remove(entity)
  }
}
