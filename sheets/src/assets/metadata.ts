import { CardType } from '@opensky/design-data/schema/cellTypes'

export const CARD_TYPE_COLORS: { [K in CardType]: string } = {
  enchant: 'hsla(99, 50%, 54%, 0.30)',
  heroAbility: 'hsla(45, 100%, 50%, 0.30)',
  spell: 'hsla(219, 66%, 62%, 0.30)',
  unit: 'hsla(0, 64%, 58%, 0.30)',
  hero: 'hsla(301, 100%, 50%, 0.30)'
}
