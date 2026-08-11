import {
  Card,
  CardEvent,
  CardInstance,
  CardLocation,
  ExactCardLocation,
  GameState,
  getInstance,
  InstanceID,
  isCard,
  isExactCardLocation,
  isOpaquePointer,
  OpaquePointer,
  Player,
  PlayerSecret,
  SkyWeaver,
  Zone
} from '@skyweaver/state-metadata'

import { FindByType } from './typeHelpers'

export class CardCache {
  protected readonly _owner: Player
  protected subscribers: Set<(c: CardCache) => void> = new Set()
  protected readonly instances: Map<LocationKey, CardInstance<SkyWeaver>> =
    new Map()
  protected readonly pointerIDs: Map<PointerKey, InstanceID> = new Map()
  protected readonly pointerLocations: Map<PointerKey, ExactCardLocation> =
    new Map()

  constructor(
    ownerOrCardCache: Player | CardCache,
    state?: [GameState<SkyWeaver>, PlayerSecret<SkyWeaver> | undefined]
  ) {
    switch (typeof ownerOrCardCache) {
      case 'number':
        this._owner = ownerOrCardCache
        if (state) {
          getReconstructionEvents(state[0], state[1]).forEach(event =>
            this.processEvent(event)
          )
        }
        break
      case 'object':
        if (state) {
          throw new Error('state not used when cloning card cache')
        }
        this._owner = ownerOrCardCache.owner
        ownerOrCardCache.instances.forEach((instance, location) => {
          this.instances.set(location, {
            ...instance,
            state: {
              ...instance.state,
              view: { ...instance.state.view },
              temporaryModifiers: [...instance.state.temporaryModifiers],
              instance: { ...instance.state.instance }
            }
          })
        })
        this.pointerIDs = new Map(ownerOrCardCache.pointerIDs)
        ownerOrCardCache.pointerLocations.forEach((location, pointer) => {
          this.pointerLocations.set(
            pointer,
            parseLocationKey(getLocationKey(location))
          )
        })
        break
    }
  }

  get owner() {
    return this._owner
  }

  drainSubscribers() {
    const s = this.subscribers
    this.subscribers = new Set()
    return s
  }

  subscribe(subscriber: (c: CardCache) => void): (() => void) | undefined {
    if (!this.subscribers.has(subscriber)) {
      this.subscribers.add(subscriber)
      return () => this.subscribers.delete(subscriber)
    } else {
      return
    }
  }

  clear() {
    this.clearPointers()
    this.instances.clear()
  }

  clearPointers() {
    this.pointerIDs.clear()
    this.pointerLocations.clear()
  }

  clearLocation(location: ExactCardLocation) {
    const key = getLocationKey(location)
    this.instances.delete(key)
  }

  has(id: InstanceID | { id: InstanceID }): boolean {
    if (typeof id === 'object') {
      return this.has(id.id)
    }

    for (const instance of this.instances.values()) {
      if (instance.id === id) {
        return true
      }
    }

    for (const instanceID of this.pointerIDs.values()) {
      if (instanceID === id) {
        return true
      }
    }

    return false
  }

  forEachInstance(
    f: (instance: CardInstance<SkyWeaver>, location: ExactCardLocation) => void
  ) {
    this.instances.forEach((instance, location) =>
      f(instance, parseLocationKey(location))
    )
  }

  getInstance(
    locatable?: Locatable | CardLocation
  ): CardInstance<SkyWeaver> | undefined {
    const location = this.getLocation(locatable)

    if (location) {
      return this.instances.get(getLocationKey(location))
    } else {
      return
    }
  }

  getLocation(
    locatable?: Locatable | CardLocation
  ): ExactCardLocation | undefined {
    switch (typeof locatable) {
      case 'undefined':
        return

      case 'number':
        for (const [location, instance] of this.instances) {
          if (instance.id === locatable) {
            return this.parseLocationKeyWithAttach(location)
          }
        }
        for (const [pointer, id] of this.pointerIDs) {
          if (id === locatable) {
            const location = this.pointerLocations.get(pointer)
            if (location) {
              return this.parseLocationKeyWithAttach(getLocationKey(location))
            }
          }
        }
        // we have no idea where the instance with the given ID is
        // it might not be correct to infer it from the store state
        return

      case 'object':
        if (isCard(locatable)) {
          if ('id' in locatable) {
            return this.getLocation(locatable.id)
          } else {
            const origKey = this.pointerLocations.get(
              getPointerKey(locatable.pointer)
            )
            if (!origKey) {
              return origKey
            }
            return this.parseLocationKeyWithAttach(getLocationKey(origKey))
          }
        } else if (isOpaquePointer(locatable)) {
          const origKey = this.pointerLocations.get(getPointerKey(locatable))
          if (!origKey) {
            return origKey
          }
          return this.parseLocationKeyWithAttach(getLocationKey(origKey))
        } else if (isExactCardLocation(locatable)) {
          return locatable
        } else {
          return
        }
    }
  }

  updateInstance(instance: CardInstance<SkyWeaver>) {
    for (const cardInstance of this.instances.values()) {
      if (cardInstance !== instance && cardInstance.id === instance.id) {
        Object.assign(cardInstance, instance)
      }
    }
  }

  processEvent(event: CardEvent<SkyWeaver>) {
    switch (event.type) {
      case 'ModifyCard': {
        this.updateInstance(event.payload.instance)
        break
      }

      case 'NewPointer': {
        const { pointer, location } = event.payload
        if (isExactCardLocation(location)) {
          this.pointerLocations.set(getPointerKey(pointer), location)
        } else {
          throw new Error(`event ${event} location not exact`)
        }
        break
      }

      case 'MoveCard': {
        const { from, to } = event.payload
        const instance = event.payload.instance?.[0]
        const fromKeys: LocationKey[] = []
        let existingInstance
        if (isExactCardLocation(from)) {
          const fromKey = getLocationKey(from)
          existingInstance = this.instances.get(fromKey)
          this.instances.delete(fromKey)
          shiftLocationKeysDown(this.instances, from)
          this.pointerLocations.forEach((location, pointer) => {
            if (this.areExactCardLocationsEqual(location, from)) {
              fromKeys.push(pointer)
              this.pointerLocations.delete(pointer)
            } else if (location.location[0].name !== 'Attachment') {
              shiftLocationDown(location, from)
            }
          })
        }
        const toKey = getLocationKey(to)
        shiftLocationKeysUp(this.instances, to)
        this.pointerLocations.forEach(location => {
          if (location.location[0].name !== 'Attachment') {
            shiftLocationUp(location, to)
          }
        })
        const destinationIsPublicOrOurSecret =
          this.isDestinationPublicOrOurSecret(to)
        if (destinationIsPublicOrOurSecret && instance) {
          if (existingInstance) {
            this.instances.set(toKey, existingInstance)
            this.updateInstance(instance)
          } else {
            this.instances.set(toKey, instance)
          }
        }
        fromKeys.forEach(pointer => {
          this.pointerLocations.set(pointer, to)
          if (instance) {
            this.pointerIDs.set(pointer, instance.id)
          }
        })
        let attachment = event.payload.instance?.[1]
        if (attachment) {
          if (!instance) {
            throw new Error(`moving public attachment with secret instance`)
          }
          const parentLocation: ExactCardLocation = {
            player: to.player,
            location: [{ name: 'Attachment', parent: { id: instance.id } }, 0]
          }
          const parentLocationKey = getLocationKey(parentLocation)
          if (!destinationIsPublicOrOurSecret) {
            // This parent card is going out of our view,
            // so we should completely remove the attachment from our cache.
            this.instances.delete(parentLocationKey)
          } else {
            this.updateInstance(attachment)
            attachment = this.getInstance(attachment) ?? attachment

            this.instances.set(parentLocationKey, attachment)
          }
        }
        this.subscribers.forEach(subscriber => subscriber(this))
        break
      }

      case 'ShuffleDeck': {
        const { player, deck } = event.payload
        const moves: Map<string, string> = new Map()
        this.instances.forEach((instance, key) => {
          const i = deck.indexOf(instance.id)
          if (i !== -1) {
            moves.set(
              key,
              getLocationKey({
                player,
                location: [{ name: 'Deck' }, i]
              })
            )
          }
        })
        mapKeys(this.instances, key => moves.get(key))
        this.pointerLocations.forEach(location => {
          const move = moves.get(getLocationKey(location))
          if (move) {
            location.location[1] = parseLocationKey(move).location[1]
          }
        })
        break
      }

      case 'SortField': {
        const { player, field, real } = event.payload
        if (!real) {
          break
        }
        const moves: Map<string, string> = new Map()
        this.instances.forEach((instance, key) => {
          const i = field.indexOf(instance.id)
          if (i !== -1) {
            moves.set(
              key,
              getLocationKey({
                player,
                location: [{ name: 'Field' }, i]
              })
            )
          }
        })
        mapKeys(this.instances, key => moves.get(key))
        this.pointerLocations.forEach(location => {
          const move = moves.get(getLocationKey(location))
          if (move) {
            location.location[1] = parseLocationKey(move).location[1]
          }
        })
        break
      }

      case 'GameEvent': {
        const action = event.payload.event
        switch (action.type) {
          case 'EnterPlayerAction':
            this.pointerIDs.clear()
            this.pointerLocations.clear()
            break
        }
        break
      }
    }
  }

  isZonePublic(zone?: Zone): boolean {
    if (!zone) {
      return false
    }

    switch (zone.name) {
      case 'Deck':
      case 'CardSelection':
        return false

      case 'Hand':
      case 'Dust':
      case 'Limbo':
        return zone.public

      case 'Field':
      case 'Graveyard':
      case 'Casting':
      case 'HeroAbility':
        return true

      case 'Attachment':
        return this.isZonePublic(this.getLocation(zone.parent)?.location?.[0])
    }
  }

  isZoneSecret(zone?: Zone): boolean | undefined {
    switch (this.isZonePublic(zone)) {
      case undefined:
        return
      case false:
        return true
      case true:
        return false
    }
  }

  isDestinationPublicOrOurSecret(to: ExactCardLocation): boolean {
    if (to.location[0].name === 'Attachment') {
      const destinationParentZone = this.getLocation(to.location[0].parent)
      if (!destinationParentZone) {
        return false
      } else {
        return (
          destinationParentZone.player === this._owner ||
          this.isZonePublic(destinationParentZone.location[0])!
        )
      }
    } else {
      // we're not attaching to a card
      // we can ! isZonePublic because we've already handled the attachment case.
      return to.player === this._owner || this.isZonePublic(to.location[0])!
    }
  }

  protected areExactCardLocationsEqual(
    a: ExactCardLocation,
    b: ExactCardLocation
  ): boolean {
    if (
      a.location[0].name === 'Attachment' &&
      a.location[0].name === b.location[0].name
    ) {
      return this.areCardsEqual(a.location[0].parent, b.location[0].parent)
    }

    if (a.player === b.player) {
      if (a.location[0].name === b.location[0].name) {
        switch (a.location[0].name) {
          case 'Deck':
          case 'Hand':
          case 'Field':
          case 'Graveyard':
          case 'Casting':
          case 'CardSelection':
            return a.location[1] === b.location[1]
          case 'Dust':
          case 'Limbo':
            return (
              a.location[0].public === (b.location[0] as any).public &&
              a.location[1] === b.location[1]
            )
          case 'Attachment':
            // This line is never executed.
            // Attachments are handled before this switch statement.
            return false
        }
      }
    }
    return false
  }

  private areCardsEqual(a: Card, b: Card): boolean {
    const aID = this.getID(a)
    if (aID === undefined) {
      return false
    }
    const bID = this.getID(b)
    if (bID === undefined) {
      return false
    }
    return aID === bID
  }

  protected getID(card: Card): InstanceID | undefined {
    if ('id' in card) {
      return card.id
    } else {
      return this.pointerIDs.get(getPointerKey(card.pointer))
    }
  }

  private parseLocationKeyWithAttach(location: LocationKey): ExactCardLocation {
    const key = parseLocationKey(location)
    if (key.location[0].name === 'Attachment') {
      key.player =
        this.getLocation(key.location[0].parent)?.player ?? (-1 as Player)
    }
    return key
  }
}

export type Locatable = Card | InstanceID | OpaquePointer

export type LocationKey = string
export type PointerKey = string

export function shiftLocationKeysDown<V>(
  map: Map<LocationKey, V>,
  removed: ExactCardLocation,
  updateChangedEntries?: (key: ExactCardLocation, value: V) => void
) {
  mapKeys(
    map,
    key => {
      const location = parseLocationKey(key)
      if (shiftLocationDown(location, removed)) {
        return getLocationKey(location)
      }
      return
    },
    updateChangedEntries
      ? (key, value) => {
          const location = parseLocationKey(key)
          updateChangedEntries(location, value)
        }
      : undefined
  )
}

export function shiftLocationKeysUp<V>(
  map: Map<LocationKey, V>,
  inserted: ExactCardLocation,
  updateChangedEntries?: (key: ExactCardLocation, value: V) => void
) {
  mapKeys(
    map,
    key => {
      const location = parseLocationKey(key)
      if (shiftLocationUp(location, inserted)) {
        return getLocationKey(location)
      }
      return
    },
    updateChangedEntries
      ? (key, value) => {
          const location = parseLocationKey(key)
          updateChangedEntries(location, value)
        }
      : undefined
  )
}

export function areExactLocationsInSameZone(
  a: ExactCardLocation,
  b: ExactCardLocation
) {
  return (
    a.player === b.player &&
    ((a.location[0].name === 'Hand' && b.location[0].name === 'Hand') ||
      (a.location[0].name === b.location[0].name &&
        ('public' in a.location[0] ? a.location[0].public : undefined) ===
          ('public' in b.location[0] ? b.location[0].public : undefined)))
  )
}

// shifts location down if it's after the removed location
// undefined behaviour if location === removed
// returns true if shifted
export function shiftLocationDown(
  location: ExactCardLocation,
  removed: ExactCardLocation
): boolean {
  if (areExactLocationsInSameZone(location, removed)) {
    if (location.location[1] === removed.location[1]) {
      throw new Error('Tried to shift location down but location === removed')
    } else if (location.location[1] > removed.location[1]) {
      location.location[1]--
      return true
    }
  }
  return false
}

// shifts location up if it's at or after the inserted location
// returns true if shifted
export function shiftLocationUp(
  location: ExactCardLocation,
  inserted: ExactCardLocation
): boolean {
  if (areExactLocationsInSameZone(location, inserted)) {
    if (location.location[1] >= inserted.location[1]) {
      location.location[1]++
      return true
    }
  }
  return false
}

export function getLocationKey(location: ExactCardLocation): LocationKey {
  let normalizedLocation = location
  if (normalizedLocation.location[0].name === 'Attachment') {
    normalizedLocation = {
      // Normalize player for attachments to -1, because we shouldn't track which player
      // an attachment is attached to. That information
      // is available by querying the parent's ID
      player: -1 as Player,
      location: [normalizedLocation.location[0], 0]
    }
  }

  return JSON.stringify(normalizedLocation)
}

export function parseLocationKey(location: LocationKey): ExactCardLocation {
  const key = JSON.parse(location) as ExactCardLocation
  return key
}

export function getPointerKey(pointer: OpaquePointer): PointerKey {
  return JSON.stringify(pointer)
}

export function mapKeys<K, V>(
  map: Map<K, V>,
  f: (key: K) => K | undefined,
  updateChangedEntries?: (key: K, value: V) => void
) {
  const entries: Array<[K, V]> = []
  map.forEach((value, key) => {
    const newKey = f(key)
    if (newKey !== undefined && newKey !== key) {
      entries.push([newKey, value])
      map.delete(key)
    }
  })
  entries.forEach(([key, value]) => {
    map.set(key, value)
    updateChangedEntries?.(key, value)
  })
}

type MaybeCardWithAttachment =
  | [CardInstance<SkyWeaver>, CardInstance<SkyWeaver> | undefined]
  | undefined

export function getReconstructionEvents(
  state: GameState<SkyWeaver>,
  secret?: PlayerSecret<SkyWeaver>
) {
  const myPlayer = secret?.player

  const cardWithAttachment: (
    id: InstanceID
  ) => MaybeCardWithAttachment = id => {
    const card = getInstance(id, state, secret)
    return card
      ? [
          card,
          card.attachment
            ? getInstance(card.attachment, state, secret)
            : undefined
        ]
      : undefined
  }
  const instances: Array<[ExactCardLocation, MaybeCardWithAttachment]> = []

  state.playerCards.forEach((playerCards, playerIndex) => {
    const player = playerIndex as Player
    const isMyPlayer = player === myPlayer
    for (let i = 0; i < playerCards.deck; i++) {
      const location: ExactCardLocation = {
        player,
        location: [{ name: 'Deck' }, i]
      }
      instances.push([
        location,
        isMyPlayer ? cardWithAttachment(secret!.deck[i]) : undefined
      ])
    }

    for (let i = 0; i < playerCards.hand.length; i++) {
      const id = playerCards.hand[i]
      const isPublic = !!id
      const location: ExactCardLocation = {
        player,
        location: [{ name: 'Hand', public: isPublic }, i]
      }
      const idIncludingSecret = id || (isMyPlayer ? secret!.hand[i] : undefined)
      instances.push([
        location,
        idIncludingSecret ? cardWithAttachment(idIncludingSecret) : undefined
      ])
    }

    for (let i = 0; i < playerCards.field.length; i++) {
      const location: ExactCardLocation = {
        player,
        location: [{ name: 'Field' }, i]
      }
      instances.push([location, cardWithAttachment(playerCards.field[i])])
    }

    for (let i = 0; i < playerCards.graveyard.length; i++) {
      const location: ExactCardLocation = {
        player,
        location: [{ name: 'Graveyard' }, i]
      }
      instances.push([location, cardWithAttachment(playerCards.graveyard[i])])
    }

    for (let i = 0; i < playerCards.casting.length; i++) {
      const location: ExactCardLocation = {
        player,
        location: [{ name: 'Casting' }, i]
      }
      instances.push([location, cardWithAttachment(playerCards.casting[i])])
    }

    for (let i = 0; i < playerCards.cardSelection; i++) {
      const location: ExactCardLocation = {
        player,
        location: [{ name: 'CardSelection' }, i]
      }
      instances.push([
        location,
        isMyPlayer ? cardWithAttachment(secret!.cardSelection[i]) : undefined
      ])
    }
    for (let i = 0; i < playerCards.heroAbility.length; i++) {
      const location: ExactCardLocation = {
        player,
        location: [{ name: 'HeroAbility' }, i]
      }
      instances.push([location, cardWithAttachment(playerCards.heroAbility[i])])
    }
    for (let i = 0; i < playerCards.dust.length; i++) {
      const location: ExactCardLocation = {
        player,
        location: [{ name: 'Dust', public: true }, i]
      }
      instances.push([location, cardWithAttachment(playerCards.dust[i])])
    }
  })

  return instances.map(([location, instance]) => {
    const event: FindByType<CardEvent<SkyWeaver>, 'MoveCard'> = {
      type: 'MoveCard',
      payload: {
        instance,
        from: { ...location, location: [{ name: 'Limbo', public: false }, 0] },
        to: location
      }
    }
    return event
  })
}
