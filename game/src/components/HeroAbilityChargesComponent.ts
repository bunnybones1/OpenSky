import { Component, Entity } from 'gg'

import { TrackableCollection } from '~/utils/TrackableCollection'

import { Components } from '.'

export default class HeroAbilityChargesComponent extends Component<void> {
  static entities = new TrackableCollection<Entity<Components>>(
    'HeroAbilityChargesComponent'
  )
  onAttach(entity: Entity<Components>) {
    HeroAbilityChargesComponent.entities.add(entity)
  }
  onDetach(entity: Entity<Components>) {
    HeroAbilityChargesComponent.entities.remove(entity)
  }
}
