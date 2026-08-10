import { RelaxedCardAttributes } from '~/components/CardInstanceComponent'

export function getHeroAbilityMeta(cardView: RelaxedCardAttributes) {
  return {
    hasCharges: cardView.charges !== undefined || cardView.cost !== 'no',
    hasCounters: cardView.counters !== undefined
  }
}
