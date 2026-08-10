import { RelaxedCardInstance } from '~/components/CardInstanceComponent'
const __reg = new Map<RelaxedCardInstance, [string, string]>()

export function hijackCardText(
  card: RelaxedCardInstance,
  title: string,
  description: string
) {
  __reg.set(card, [title, description])
}
export function checkForHijackedCardText(card: RelaxedCardInstance) {
  if (__reg.has(card)) {
    return __reg.get(card)!
  } else {
    return undefined
  }
}
