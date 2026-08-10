import { translate } from '@opensky/language-manager'

import { getCardCache } from '~/cardCache'

import Row from '../components/DeckViewerSidebar/Row'

function sortByCardCacheOrder(a: Row, b: Row) {
  if (a.dim && !b.dim) {
    return -1
  } else if (!a.dim && b.dim) {
    return 1
  }
  const aRealEntity = getCardCache().getEntity(a.entity.get('cardInstance'))
  const bRealEntity = getCardCache().getEntity(b.entity.get('cardInstance'))

  if (
    aRealEntity &&
    aRealEntity.has('order') &&
    bRealEntity &&
    bRealEntity.has('order')
  ) {
    return aRealEntity.get('order') - bRealEntity.get('order')
  } else {
    return -1
  }
}

export function sortByReverseCardCacheOrder(a: Row, b: Row) {
  return -sortByCardCacheOrder(a, b)
}

export function sortByCostAndDimness(a: Row, b: Row) {
  // Sort by mana cost
  if (a.dim && !b.dim) {
    return 1
  } else if (!a.dim && b.dim) {
    return -1
  }

  const aInstance = a.entity.get('cardInstance')
  const bInstance = b.entity.get('cardInstance')
  const aCost = aInstance.state.view.cost
  const bCost = bInstance.state.view.cost

  const aName = translate.card.name(aInstance.base)
  const bName = translate.card.name(bInstance.base)

  const costCompare =
    typeof aCost === 'number' && typeof bCost === 'number'
      ? aCost - bCost
      : typeof aCost === 'number'
      ? 1
      : -1
  return costCompare * 100 + aName.localeCompare(bName) / 100
}

export function sortByReverseCostAndDimness(a: Row, b: Row) {
  return -sortByCostAndDimness(a, b)
}
