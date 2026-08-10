import { translate } from '@opensky/language-manager'
import {
  BaseCard,
  CardLibrary,
  InstanceID,
  isCharacter,
  isHero,
  Rarity,
  Trait
} from '@skyweaver/state-metadata'

import { getCardCache } from '~/cardCache'
import {
  RelaxedCardAttributes,
  RelaxedCardInstance
} from '~/components/CardInstanceComponent'

let fakeInstanceIDCounter = 100000000

export const createCardInstanceFromID = (
  cardBaseID: BaseCard
): RelaxedCardInstance => {
  const base = CardLibrary.get(cardBaseID)!

  if (!base) {
    throw new Error(`Card ID ${cardBaseID} not found!`)
  }

  const instance: RelaxedCardAttributes = {
    ...base,
    markedForDeath: undefined,
    isSilenced: false,
    canBeTargetedByOwner: true,
    canBeTargetedByEnemy: true,
    rarity: 'base',
    attackRestrictions: [],
    effects: [],
    attackState: 'Ready',
    isXCost: false,
    healthFrozen: false,
    didAttack: false,
    canBePlayed: base.cost !== 'no',
    charges: undefined,
    counters: undefined,
    maxCharges: base.maxCharges ?? undefined,
    maxCounters: base.maxCounters ?? undefined,
    perTurn: base.perTurn ?? undefined,
    health: base.health ?? 0,
    power: base.power ?? 0
  }

  const instanceId = fakeInstanceIDCounter++

  const view: RelaxedCardInstance = {
    id: instanceId,
    base: cardBaseID,
    attachment: base.attachment
      ? createCardInstanceFromID(base.attachment).id
      : undefined,
    state: {
      view: instance,
      temporaryModifiers: [],
      fieldAge: 0,
      effectTypes: []
    }
  }

  return view
}

const __fakeCards = new Map<`${BaseCard}-${Rarity}`, RelaxedCardInstance>()

export const getFakeCardTagView = (
  id: BaseCard,
  rarity: Rarity,
  traits?: Trait[],
  unique = false
): RelaxedCardInstance => {
  const idRarity = `${id}-${rarity}` as const
  if (!unique && __fakeCards.has(idRarity)) {
    return __fakeCards.get(idRarity)!
  }

  const card = createCardInstanceFromID(id)

  if (traits) {
    card.state.view.traits = traits
  }
  card.state.view.rarity = rarity
  if (!unique) {
    __fakeCards.set(idRarity, card)
  }

  return card
}

export function getReferencedCardInstances(
  card: RelaxedCardInstance
): RelaxedCardInstance[] {
  const views: RelaxedCardInstance[] = []
  const cardMeta = CardLibrary.get(card.base)

  const rarity = card.state.view.rarity
  // Prioritize attached spells
  if (isCharacter(card)) {
    if (card.attachment !== undefined) {
      const cardCache = getCardCache()
      const attachment = cardCache && cardCache.getInstance(card.attachment)
      if (attachment) {
        // Use the real card view for attached spells
        views.push(attachment)
      } else {
        // There's no real attachment, use the fake one
        if (cardMeta && cardMeta.attachment) {
          views.push(getFakeCardTagView(cardMeta.attachment, rarity))
        }
      }
    }
  }

  if (cardMeta && cardMeta.relatedCards) {
    for (const card of cardMeta.relatedCards) {
      const id = `${card}` as BaseCard
      // Use fake card view for referenced cards as they dont exist yet
      const childCard = getFakeCardTagView(id, rarity)!
      views.push(childCard)
      if (isCharacter(childCard) && childCard.attachment !== undefined) {
        // There's no real attachment, use the fake one
        const childCardMeta = CardLibrary.get(id)
        if (childCardMeta && childCardMeta.attachment) {
          views.push(getFakeCardTagView(childCardMeta.attachment, rarity))
        }
      }
    }
  }

  return views.filter(Boolean)
}

export function shouldShowManaGem(card: RelaxedCardInstance) {
  if (isHero(card)) {
    return false
  }
  const meta = CardLibrary.get(card.base)
  if (meta) {
    return meta.cost !== 'no'
  } else {
    return card.state.view.canBePlayed
  }
}

export function getId(card: InstanceID | RelaxedCardInstance): InstanceID {
  return typeof card === 'number' ? card : card.id
}

export function getBaseCard(passedCard: string): BaseCard | undefined {
  const card = passedCard.trim()
  if (!!Number.parseInt(card, 10)) {
    return CardLibrary.get(`${card}` as BaseCard)
      ? (`${card}` as BaseCard)
      : undefined
  } else {
    for (const id of CardLibrary.keys()) {
      const cc = translate.card.name(id)

      if (cc.toLowerCase() === card.toLowerCase()) {
        return id
      }
    }
    return undefined
  }
}
