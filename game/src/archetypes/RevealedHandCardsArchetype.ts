import { Archetype } from 'gg'

import { Components } from '~/components'

export default class RevealedHandCardsArchetype extends Archetype<Components> {
  filters = [
    this.include('mesh', 'card', 'cardInstance', 'inHand', 'isRevealed')
  ]
}
