import { Archetype } from 'gg'

import { Components } from '~/components'

export default class ScreenSpaceArchetype extends Archetype<Components> {
  filters = [this.include('screenSpace', 'transform')]
}
