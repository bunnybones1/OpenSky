import { Archetype } from 'gg'

import { Components } from '~/components'

export default class SleepingArchetype extends Archetype<Components> {
  filters = [this.include('character', 'sleeping')]
}
