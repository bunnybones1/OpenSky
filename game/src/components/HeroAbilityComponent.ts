import { Component, Entity } from 'gg'

import { TrackableCollection } from '~/utils/TrackableCollection'

import { Components } from '.'

export default class HeroAbilityComponent extends Component<void> {
  static entities = new TrackableCollection<Entity<Components>>(
    'HeroAbilityComponent'
  )
  onAttach(entity: Entity<Components>) {
    HeroAbilityComponent.entities.add(entity)
  }
  onDetach(entity: Entity<Components>) {
    HeroAbilityComponent.entities.remove(entity)
  }
}
