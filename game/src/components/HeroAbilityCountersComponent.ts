import { Component, Entity } from 'gg'

import { TrackableCollection } from '~/utils/TrackableCollection'

import { Components } from '.'

export default class HeroAbilityCountersComponent extends Component<void> {
  static entities = new TrackableCollection<Entity<Components>>(
    'HeroAbilityCountersComponent'
  )
  onAttach(entity: Entity<Components>) {
    HeroAbilityCountersComponent.entities.add(entity)
  }
  onDetach(entity: Entity<Components>) {
    HeroAbilityCountersComponent.entities.remove(entity)
  }
}
