import {
  CardCache,
  getLocationKey,
  getPointerKey,
  getReconstructionEvents,
  Locatable,
  LocationKey,
  mapKeys,
  parseLocationKey,
  PointerKey,
  shiftLocationDown,
  shiftLocationKeysDown,
  shiftLocationKeysUp,
  shiftLocationUp
} from '@opensky/shared/cardCache'
import { migrateLiveProperty } from '@opensky/shared/utils/propertyListeners'
import {
  CardAttributes,
  CardEvent,
  CardInstance,
  CardLocation,
  ExactCardLocation,
  GameState,
  InstanceID,
  isCard,
  isExactCardLocation,
  isOpaquePointer,
  Player,
  PlayerSecret,
  SkyWeaver,
  Zone
} from '@skyweaver/state-metadata'
import { Entity } from 'gg'

import { Components } from './components'

// Source of truth for synced card data - card mutations should only be done to items in this map
let cardCache: CardCacheWithEntities
export function getCardCache(): CardCacheWithEntities {
  return cardCache
}
export function initializeCardCache(player: Player) {
  const old = cardCache
  if (old) {
    console.warn('tearing down old card cache!')
  }
  cardCache = new CardCacheWithEntities(player)
  if (old) {
    const oldSubs = old.drainSubscribers()
    for (const sub of oldSubs) {
      cardCache.subscribe(sub)
    }
  }
}

const livePropKeys: Array<keyof CardAttributes> = [
  'cost',
  'charges',
  'maxCharges',
  'counters',
  'maxCounters',
  'power',
  'health',
  'element',
  'attackState',
  'isSilenced'
]

export class CardCacheWithEntities extends CardCache {
  private readonly entities: Map<LocationKey, Entity<Components>> = new Map()
  protected readonly pointerIDs: Map<PointerKey, InstanceID> = new Map()

  constructor(
    ownerOrCardCache: Player | CardCacheWithEntities,
    state?: [GameState<SkyWeaver>, PlayerSecret<SkyWeaver> | undefined]
  ) {
    super(
      typeof ownerOrCardCache === 'number'
        ? ownerOrCardCache
        : ownerOrCardCache.owner
    )
    switch (typeof ownerOrCardCache) {
      case 'number':
        if (state) {
          getReconstructionEvents(state[0], state[1]).forEach(event =>
            this.processEvent(event)
          )
        }
        this.entities = new Map(cardCache?.entities)
        break
      case 'object':
        if (state) {
          throw new Error('state not used when cloning card cache')
        }
        this.entities = new Map(ownerOrCardCache.entities)
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
  clear() {
    super.clear()
    this.entities.clear()
  }

  getEntity(
    locatable?: Locatable | CardLocation
  ): Entity<Components> | undefined {
    switch (typeof locatable) {
      case 'undefined':
        return

      case 'number':
        return this.findEntity(
          entity =>
            entity.has('cardInstance') &&
            entity.get('cardInstance').id === locatable
        )

      case 'object':
        if (isOpaquePointer(locatable)) {
          const id = this.pointerIDs.get(getPointerKey(locatable))
          if (id !== undefined) {
            return this.getEntity(id)
          } else {
            return this.getEntity(this.getLocation(locatable))
          }
        } else if (isCard(locatable)) {
          const id = this.getID(locatable)
          if (id !== undefined) {
            return this.getEntity(id)
          } else {
            return this.getEntity(this.getLocation(locatable))
          }
        } else if (isExactCardLocation(locatable)) {
          return this.entities.get(getLocationKey(locatable))
        } else {
          return
        }
    }
  }

  setEntity(location: ExactCardLocation, entity: Entity<Components>) {
    this.entities.set(getLocationKey(location), entity)
  }

  removeEntity(entity: Entity<Components>) {
    this.entities.forEach((value, location) => {
      if (value === entity) {
        this.entities.delete(location)
      }
    })
  }

  findEntity(
    f: (entity: Entity<Components>) => boolean
  ): Entity<Components> | undefined {
    for (const entity of this.entities.values()) {
      if (f(entity)) {
        return entity
      }
    }

    return
  }

  forEachEntity(
    f: (entity: Entity<Components>, location: ExactCardLocation) => void
  ) {
    this.entities.forEach((entity, location) =>
      f(entity, parseLocationKey(location))
    )
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
            return parseLocationKey(location)
          }
        }
        // we have no idea where the instance with the given ID is
        // it might not be correct to infer it from the store state
        return

      case 'object':
        if (locatable instanceof Entity) {
          for (const [location, entity] of this.entities) {
            if (entity === locatable) {
              return parseLocationKey(location)
            }
          }
          return
        } else if (isCard(locatable)) {
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
          return
        }
    }
  }

  updateInstance(instance: CardInstance<SkyWeaver>) {
    for (const cardInstance of this.instances.values()) {
      if (cardInstance !== instance && cardInstance.id === instance.id) {
        const oldView = cardInstance.state.view
        Object.assign(cardInstance, instance)
        for (const key of livePropKeys) {
          if (key in oldView) {
            migrateLiveProperty(oldView, cardInstance.state.view, key)
          }
        }
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
          throw new Error(`event ${JSON.stringify(event)} location not exact`)
        }
        break
      }

      case 'MoveCard': {
        const { from, to } = event.payload
        let entity: Entity<Components> | undefined
        const instance = event.payload.instance?.[0]
        const fromKeys: LocationKey[] = []
        let existingInstance
        if (isExactCardLocation(from)) {
          const fromKey = getLocationKey(from)
          entity = this.entities.get(fromKey)
          this.entities.delete(fromKey)
          existingInstance = this.instances.get(fromKey)
          this.instances.delete(fromKey)
          shiftLocationKeysDown(this.entities, from)
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
        shiftLocationKeysUp(this.entities, to)
        shiftLocationKeysUp(this.instances, to)
        this.pointerLocations.forEach(location => {
          if (location.location[0].name !== 'Attachment') {
            shiftLocationUp(location, to)
          }
        })
        if (entity) {
          this.entities.set(toKey, entity)
        }
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
        mapKeys(this.entities, key => moves.get(key))
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
        mapKeys(this.entities, key => moves.get(key))
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
      case 'HeroAbility':
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
  cardOwner(entity: Entity<Components>): Player {
    return (entity.has('player') ? this.owner : 1 - this.owner) as Player
  }
}
