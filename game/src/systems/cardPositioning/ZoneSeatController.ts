import { Entity } from 'gg'
import { Quaternion, Vector3 } from 'three'

import { Components } from '~/components'
import { Seat } from '~/components/CardZoneComponent'
import { NOOP } from '~/utils/jsUtils'
import { ReadonlyTrackableCollection } from '~/utils/TrackableCollection'

import { TargetTransform } from '../animation/transform'
import { moveSeat } from '../animation/zoneSeatUtils'

export function sortSeatsByOrder(a: Seat, b: Seat) {
  return a.entity.get('order') - b.entity.get('order')
}

const __genericTarget = {
  position: new Vector3(),
  quaternion: new Quaternion(),
  scale: new Vector3(1, 1, 1)
}

type MakeIndexTransform = (seat: Seat, i: number) => TargetTransform | undefined

function __defaultMakeIndexTransform(): TargetTransform | undefined {
  return __genericTarget
}
function __defaultUpdateSeat(seat: Seat, target: TargetTransform) {
  moveSeat(seat, target, 1000)
}

export default class ZoneSeatController {
  private _seats: Seat[] = []
  get seats(): Seat[] {
    return this._seats
  }
  set seats(value: Seat[]) {
    throw new Error('seats are read only')
  }
  private _needsSorting = false
  private _lastKnownSeatCount = 0
  private _needsMoving: boolean
  private _countChanged: boolean
  constructor(
    public name: string,
    items: ReadonlyTrackableCollection<Entity<Components>>,
    private _updateShared: (dt: number) => void = NOOP,
    public makeIndexTransform: MakeIndexTransform = __defaultMakeIndexTransform,
    private _updateSeat = __defaultUpdateSeat,
    private sorter: ((a: Seat, b: Seat) => number) | null = sortSeatsByOrder,
    private _postUpdate?: () => void
  ) {
    items.listenForAdd(entity => {
      const seat = new Seat(entity, this.name)
      entity.get('zone').giveNewSeat(seat)
      this._seats.push(seat)
      this._needsSorting = true
      this._countChanged = true
    })
    items.listenForRemove(entity => {
      for (let i = this._seats.length - 1; i >= 0; i--) {
        if (this._seats[i].entity === entity) {
          this._seats.splice(i, 1)
        }
      }
      this._needsSorting = true
      this._countChanged = true
    })
    this.update(0)
  }
  requestSort = () => {
    this._needsSorting = true
  }
  markEntitySeatDirty(entity: Entity<Components>) {
    for (let i = this._seats.length - 1; i >= 0; i--) {
      if (this._seats[i].entity === entity) {
        this._seats[i].needsToMove = true
        this._needsMoving = true
      }
    }
  }
  forAllSeats(doThis: (seat: Seat) => void) {
    this._seats.forEach(doThis)
  }
  requestMovement() {
    this._needsMoving = true
  }
  update(dt: number) {
    const ordered = this._seats
    if (this._needsSorting) {
      this._needsSorting = false

      const prevOrdered = ordered.slice()
      if (this.sorter) {
        ordered.sort(this.sorter)
      }

      if (this._lastKnownSeatCount !== ordered.length) {
        this._countChanged = true
      }
      this._lastKnownSeatCount = ordered.length

      let anyChanged = false

      for (let i = 0; i < prevOrdered.length; i++) {
        if (prevOrdered[i] !== ordered[i]) {
          ordered[i].needsToMove = true
          anyChanged = true
        }
      }

      if (anyChanged) {
        this._needsMoving = true
      }
    }
    if (this._needsMoving || this._countChanged) {
      this._updateShared(dt)

      for (let i = 0; i < ordered.length; i++) {
        const seat = ordered[i]
        if (seat.needsToMove || this._countChanged) {
          const transform = this.makeIndexTransform(seat, i)
          if (transform) {
            this._updateSeat(seat, transform)
            seat.needsToMove = false
          }
        }
      }
      if (this._postUpdate) {
        this._postUpdate()
      }
      this._needsMoving = false
      this._countChanged = false
    }
  }
  isLastSeat(seat: Seat) {
    return this.seats[this.seats.length - 1] === seat
  }
}
