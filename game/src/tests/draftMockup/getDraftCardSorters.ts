import { translate } from '@opensky/language-manager'
import { Rarity, Type } from '@skyweaver/state-metadata'

import { elementsArr } from '~/constants'

import { CardSortTypes, DraftStateCard } from './DraftState'
import { getCachedCardStateView } from './getCachedCardStateView'
let sorters:
  | {
      [K in CardSortTypes]: (a: DraftStateCard, b: DraftStateCard) => number
    }
  | undefined
export function getDraftCardSorters() {
  if (!sorters) {
    const costLookup = new Map<DraftStateCard, number>()
    function getCost(card: DraftStateCard) {
      if (!costLookup.has(card)) {
        const cardView = getCachedCardStateView(card)
        const cost =
          typeof cardView.state.view.cost === 'string'
            ? 0
            : cardView.state.view.cost
        costLookup.set(card, cost)
      }
      return costLookup.get(card)!
    }
    const elementLookup = new Map<DraftStateCard, number>()
    function getElement(card: DraftStateCard) {
      if (!elementLookup.has(card)) {
        const cardView = getCachedCardStateView(card)
        elementLookup.set(
          card,
          elementsArr.indexOf(cardView.state.view.element)
        )
      }
      return elementLookup.get(card)!
    }
    const rarityArr: Rarity[] = ['none', 'base', 'silver', 'gold']
    const rarityLookup = new Map<DraftStateCard, number>()
    function getRarity(card: DraftStateCard) {
      if (!rarityLookup.has(card)) {
        rarityLookup.set(card, rarityArr.indexOf(card.rarity))
      }
      return rarityLookup.get(card)!
    }
    const unitOrSpellArr: Type[] = ['unit', 'spell']
    const unitOrSpellLookup = new Map<DraftStateCard, number>()
    function getUnitOrSpell(card: DraftStateCard) {
      if (!unitOrSpellLookup.has(card)) {
        const cardView = getCachedCardStateView(card)
        unitOrSpellLookup.set(
          card,
          unitOrSpellArr.indexOf(cardView.state.view.type)
        )
      }
      return unitOrSpellLookup.get(card)!
    }

    const cardNameLookup = new Map<DraftStateCard, string>()
    function getCardName(card: DraftStateCard) {
      if (!cardNameLookup.has(card)) {
        cardNameLookup.set(card, translate.card.name(card.base))
      }
      return cardNameLookup.get(card)!
    }

    sorters = {
      cost: (a, b) => getCost(a) - getCost(b),
      element: (a, b) => getElement(a) - getElement(b),
      rarity: (a, b) => getRarity(a) - getRarity(b),
      unitOrSpell: (a, b) => getUnitOrSpell(a) - getUnitOrSpell(b),
      alphabetical: (a, b) => (getCardName(a) > getCardName(b) ? 1 : -1)
    }
  }
  return sorters!
}
