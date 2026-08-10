import {
  isCard,
  isExactCardLocation,
  isOpaquePointer
} from '@skyweaver/state-metadata'
import type {
  Card,
  CardEvent,
  CardInstance,
  CardLocation,
  ExactCardLocation,
  InstanceID,
  OpaquePointer,
  Player,
  SkyWeaver,
  Zone
} from '@skyweaver/state-node-sys'

// Source of truth for synced card data - card mutations should only be done to items in this map
let cardCache: CardCache
export function getCardCache(): CardCache {
  return cardCache
}
export function initializeCardCache(player: Player) {
  const old = cardCache
  if (old) {
    // console.warn('tearing down old card cache!')
  }
  cardCache = new CardCache(player)
  if (old) {
    const oldSubs = old.drainSubscribers()
    for (const sub of oldSubs) {
      cardCache.subscribe(sub)
    }
  }
}

export default class CardCache {
  private readonly _owner: Player
  private subscribers: Set<(c: CardCache) => void> = new Set()
  private readonly instances: Map<LocationKey, CardInstance<SkyWeaver>> =
    new Map()
  private readonly pointerIDs: Map<PointerKey, InstanceID> = new Map()
  private readonly pointerLocations: Map<PointerKey, ExactCardLocation> =
    new Map()

  constructor(ownerOrCardCache: Player | CardCache) {
    switch (typeof ownerOrCardCache) {
      case 'number':
        this._owner = ownerOrCardCache

        break
      case 'object':
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
      return undefined
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
      if (typeof locatable === 'number') {
        // console.log(
        //   'ahh',
        //   locatable,
        //   location,
        //   [...this.instances].map(i => i[1].id).includes(113)
        // )
      }
      return undefined
    }
  }

  getLocation(
    locatable?: Locatable | CardLocation
  ): ExactCardLocation | undefined {
    switch (typeof locatable) {
      case 'undefined':
        return undefined

      case 'number':
        for (const [location, instance] of this.instances) {
          if (instance.id === locatable) {
            if (locatable === 113) {
              //   console.log('YEET1:', parseLocationKey(location))
            }
            return parseLocationKey(location)
          }
        }
        for (const [pointer, id] of this.pointerIDs) {
          if (id === locatable) {
            if (locatable === 113) {
              //   console.log('YEET2:', this.pointerIDs)
            }
            const location = this.pointerLocations.get(pointer)
            if (location) {
              return location
            }
          }
        }
        // we have no idea where the instance with the given ID is
        // it might not be correct to infer it from the store state
        return undefined

      case 'object':
        if (isCard(locatable)) {
          if ('id' in locatable) {
            return this.getLocation(locatable.id)
          } else {
            return this.pointerLocations.get(getPointerKey(locatable.pointer))
          }
        } else if (isOpaquePointer(locatable)) {
          return this.pointerLocations.get(getPointerKey(locatable))
        } else if (isExactCardLocation(locatable)) {
          return locatable
        } else {
          return undefined
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
        // console.log('YO', instance.id, instance.base)
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
            if (instance.id === 113) {
              //   console.log('SETTING INSTANCE')
            }
            this.instances.set(toKey, existingInstance)
            this.updateInstance(instance)
          } else {
            this.instances.set(toKey, instance)
          }
        }
        fromKeys.forEach(pointer => {
          this.pointerLocations.set(pointer, to)
          if (instance) {
            if (instance.id === 113) {
              //   console.log('AHHH', pointer)
            }
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
        return true

      case 'Attachment':
        return this.isZonePublic(this.getLocation(zone.parent)?.location?.[0])
    }
  }

  isZoneSecret(zone?: Zone): boolean | undefined {
    switch (this.isZonePublic(zone)) {
      case undefined:
        return undefined
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
        // return false
      } else {
        // return (
        //   destinationParentZone.player === this._owner ||
        //   this.isZonePublic(destinationParentZone.location[0])!
        // )
      }
    } else {
      // we're not attaching to a card
      // we can ! isZonePublic because we've already handled the attachment case.
      //   return to.player === this._owner || this.isZonePublic(to.location[0])!
    }
    return true
  }

  private areExactCardLocationsEqual(
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

  private getID(card: Card): InstanceID | undefined {
    if ('id' in card) {
      return card.id
    } else {
      return this.pointerIDs.get(getPointerKey(card.pointer))
    }
  }
}

export type Locatable = Card | InstanceID | OpaquePointer

type LocationKey = string
type PointerKey = string

function shiftLocationKeysDown<V>(
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
      return undefined
    },
    updateChangedEntries
      ? (key, value) => {
          const location = parseLocationKey(key)
          updateChangedEntries(location, value)
        }
      : undefined
  )
}

function shiftLocationKeysUp<V>(
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
      return undefined
    },
    updateChangedEntries
      ? (key, value) => {
          const location = parseLocationKey(key)
          updateChangedEntries(location, value)
        }
      : undefined
  )
}

function areExactLocationsInSameZone(
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
function shiftLocationDown(
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
function shiftLocationUp(
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

function getLocationKey(location: ExactCardLocation): LocationKey {
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

function parseLocationKey(location: LocationKey): ExactCardLocation {
  return JSON.parse(location)
}

function getPointerKey(pointer: OpaquePointer): PointerKey {
  return JSON.stringify(pointer)
}

function mapKeys<K, V>(
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
