import { Archetype } from 'gg'

import { Components } from '~/components'

export default class TriggersHolderArchetype extends Archetype<Components> {
  filters = [
    this.include('triggersHolder', 'mesh', 'cardInstance', 'character')
  ]
}
