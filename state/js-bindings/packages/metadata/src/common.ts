import type {
  Card,
  CardInstance,
  CardLocation,
  Element,
  ExactCardLocation,
  GameState,
  InstanceID,
  Trait,
  OpaquePointer,
  Player,
  PlayerSecret,
  Prism,
  SkyWeaver,
  Type,
  Zone
} from '@skyweaver/state-metadata-sys'

export function isCharacter(card: {
  state: { view: { type: Type } }
}): boolean {
  return isHero(card) || isUnit(card)
}

export function isHero(card: { state: { view: { type: Type } } }): boolean {
  return card.state.view.type === 'hero'
}
export function isHeroAbility(card: {
  state: { view: { type: Type } }
}): boolean {
  return card.state.view.type === 'heroAbility'
}

export function isUnit(card: { state: { view: { type: Type } } }): boolean {
  return card.state.view.type === 'unit'
}

export const PRISMS: { [K in Prism]: unknown } = Object.freeze({
  agy: 0,
  hrt: 0,
  int: 0,
  str: 0,
  tok: 0,
  wis: 0,
  tut: 0
})

export function isPrism(string: string): string is Prism {
  return Object.keys(PRISMS).includes(string)
}

export const ELEMENTS: { [K in Element]: unknown } = Object.freeze({
  light: 0,
  mind: 0,
  fire: 0,
  air: 0,
  water: 0,
  earth: 0,
  metal: 0,
  dark: 0,
  sky: 0
})

export function isElement(string: string): string is Element {
  return Object.keys(ELEMENTS).includes(string)
}

export const TRAITS: { [K in Trait]: unknown } = Object.freeze({
  armor: 0,
  banner: 0,
  guard: 0,
  lifesteal: 0,
  stealth: 0,
  wither: 0,
  dash: 0
})

export function isTrait(string: string): string is Trait {
  return Object.keys(TRAITS).includes(string)
}

export function isExactCardLocation(value: any): value is ExactCardLocation {
  if (typeof value !== 'object') {
    return false
  }

  if (typeof value.player !== 'number') {
    return false
  }

  if (typeof value.location !== 'object') {
    return false
  }

  if (!(value.location instanceof Array)) {
    return false
  }

  if (value.location.length !== 2) {
    return false
  }

  if (!isZone(value.location[0])) {
    return false
  }

  switch (typeof value.location[1]) {
    case 'number':
      break
    case 'undefined':
      if (value.location[0].name !== 'Attachment') {
        return false
      }
      break
    default:
      return false
  }

  return true
}

export function isZone(value: any): value is Zone {
  if (typeof value !== 'object') {
    return false
  }

  const nameTyped = value.name as Zone['name']
  switch (nameTyped) {
    case 'Deck':
    case 'Field':
    case 'Graveyard':
    case 'Casting':
    case 'HeroAbility':
    case 'CardSelection':
      return true

    case 'Hand':
    case 'Dust':
    case 'Limbo':
      return typeof value.public === 'boolean'

    case 'Attachment':
      return isCard(value.parent)

    default:
      const _never: never = nameTyped
      void _never
      return false
  }
}

export function isCard(value: any): value is Card {
  return (
    typeof value === 'object' &&
    (typeof value.id === 'number' || isOpaquePointer(value.pointer))
  )
}

export function isOpaquePointer(value: any): value is OpaquePointer {
  return (
    typeof value === 'object' &&
    typeof value.player === 'number' &&
    typeof value.index === 'number'
  )
}

export function getInstance(
  id: InstanceID | undefined,
  state: GameState<SkyWeaver>,
  secret?: PlayerSecret<SkyWeaver>
): CardInstance<SkyWeaver> | undefined {
  if (id === undefined) {
    return
  }

  const instance = state.instances[id]

  if ('instance' in instance) {
    return instance.instance
  } else if (instance.player === secret?.player) {
    return secret.instances.get(id)
  } else {
    return
  }
}

export function findInstanceID(
  id: InstanceID,
  state: GameState<SkyWeaver>,
  secret?: PlayerSecret<SkyWeaver>
): CardLocation {
  const instance = state.instances[id]

  if ('player' in instance) {
    if (secret && secret.player === instance.player) {
      const collections: Array<[Zone, Array<number | undefined>]> = [
        [{ name: 'Deck' }, secret.deck],
        [{ name: 'Hand', public: false }, secret.hand],
        [{ name: 'Dust', public: false }, secret.dust],
        [{ name: 'Limbo', public: false }, secret.limbo],
        [{ name: 'CardSelection' }, secret.cardSelection]
      ]

      for (const [zone, collection] of collections) {
        const index = collection.indexOf(id)
        if (index !== -1) {
          return { player: instance.player, location: [zone, index] }
        }
      }

      for (const parent in secret.instances) {
        const instance = secret.instances.get(+parent)!
        if (instance.attachment === id) {
          return {
            player: secret.player,
            location: [
              { name: 'Attachment', parent: { id: +parent } },
              undefined
            ]
          }
        }
      }

      throw new Error(
        `player ${instance.player} secret card #${id} not in any secret zone`
      )
    } else {
      return { player: instance.player, location: undefined }
    }
  }

  for (let player = 0; player < state.playerCards.length; player++) {
    const playerCards = state.playerCards[player]
    const collections: Array<[Zone, Array<number | undefined>]> = [
      [{ name: 'Hand', public: true }, playerCards.hand],
      [{ name: 'Field' }, playerCards.field],
      [{ name: 'Graveyard' }, playerCards.graveyard],
      [{ name: 'Dust', public: true }, playerCards.dust],
      [{ name: 'Limbo', public: true }, playerCards.limbo],
      [{ name: 'Casting' }, playerCards.casting]
    ]

    for (const [zone, collection] of collections) {
      const index = collection.indexOf(id)
      if (index !== -1) {
        return { player: player as Player, location: [zone, index] }
      }
    }
  }

  for (let parent = 0; parent < state.instances.length; parent++) {
    const instance = state.instances[parent]
    if ('instance' in instance && instance.instance.attachment === id) {
      return {
        player: findInstanceID(parent, state).player,
        location: [{ name: 'Attachment', parent: { id: parent } }, undefined]
      }
    }
  }

  throw new Error(`public card #${id} not in any public zone`)
}
