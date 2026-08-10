import { Zone } from '@skyweaver/state-metadata'
import { Component, Entity } from 'gg'

import { IsAnimating } from '~/components/IsAnimatingComponent'
import { zoneCollections } from '~/helpers/zoneCollections'
import { CardStatus, FakeZone, OwnedCardStatus, Owner } from '~/types'

import { Components } from '.'
import { Seat } from './CardZoneComponent'

export type ZoneType = Zone['name']
export type FakeZoneType = FakeZone['name']

const noop = () => {
  //
}

function __makeNullSeat(entity: Entity<Components>) {
  const seat = new Seat(entity, 'null')
  return seat
}
export class ZoneData {
  private _stateZone: ZoneType = 'Limbo'
  get stateZone(): ZoneType {
    return this._stateZone
  }
  pendingFinalZoneChange: Promise<IsAnimating | undefined> | undefined
  finalZoneResolver: ((anim: IsAnimating | undefined) => void) | undefined
  setStateZone(value: ZoneType) {
    if (value === 'Limbo') {
      return //this is important as Limbo is more of a state of mind than an actual zone
    }
    if (this._stateZone !== value) {
      this._stateZone = value
      this._onZoneChangeRequest()
    }
  }
  private _userZone: FakeZoneType = 'UseState'
  get userZone(): FakeZoneType {
    return this._userZone
  }
  setUserZone(value: FakeZoneType) {
    if (this._userZone !== value) {
      this._userZone = value
      this._onZoneChangeRequest()
    }
  }
  private _owner: Owner = 'Opponent'
  get owner(): Owner {
    return this._owner
  }
  setOwner(value: Owner) {
    if (this._owner !== value) {
      this._owner = value
      this._onZoneChangeRequest()
    }
  }
  private _onZoneChangeRequest() {
    if (!this.pendingFinalZoneChange) {
      this.pendingFinalZoneChange = new Promise(resolve => {
        this.finalZoneResolver = anim => {
          this.pendingFinalZoneChange = undefined
          this.finalZoneResolver = undefined
          resolve(anim)
        }
      })
      this.dirtyInputCallback()
    }
  }
  processChanges() {
    const newCardStatus = `${
      this.userZone === 'UseState' ? this.stateZone : this.userZone
    }` as const
    const newOwnedCardStatus = `${this.owner}_${newCardStatus}` as const
    if (newOwnedCardStatus !== this.current.ownedCardStatus) {
      this.previous = this.current
      this.current = {
        owner: this.owner,
        cardStatus: newCardStatus,
        ownedCardStatus: newOwnedCardStatus,
        seat: this.previous.seat
      }
      return true
    } else {
      return false
    }
  }
  giveNewSeat(seat: Seat) {
    if (this.previous.seat.animation) {
      this.previous.seat.animation.kill()
      this.previous.seat.animation = undefined
    }
    this.current.seat = seat
  }
  instantaneous = false
  previous: ZoneStatusData
  current: ZoneStatusData
  init(entity: Entity<Components>) {
    this.previous = {
      owner: 'Opponent',
      cardStatus: 'Void',
      ownedCardStatus: 'Opponent_Void',
      seat: __makeNullSeat(entity)
    }
    this.current = {
      owner: 'Opponent',
      cardStatus: 'Void',
      ownedCardStatus: 'Opponent_Void',
      seat: __makeNullSeat(entity)
    }
    zoneCollections.Void.add(entity)
  }
  dirtyInputCallback = noop
}

interface ZoneStatusData {
  owner: Owner
  cardStatus: CardStatus
  ownedCardStatus: OwnedCardStatus
  seat: Seat
}

export default class ZoneComponent extends Component<ZoneData> {
  static ignoreDragging = false
  static dirtyEntities = new Set<Entity<Components>>()
  constructor() {
    super(new ZoneData())
  }

  onAttach(entity: Entity<Components>) {
    this.value.init(entity)
    this.value.dirtyInputCallback = ZoneComponent.dirtyEntities.add.bind(
      ZoneComponent.dirtyEntities,
      entity
    )
  }
}
