import { Component, Entity } from 'gg'

import { TrackableCollection } from '~/utils/TrackableCollection'

import { Components } from '.'

export default class InspectingComponent extends Component<void> {
  static entities = new TrackableCollection<Entity<Components>>(
    'InspectingComponent'
  )
  static removeFromAll() {
    while (InspectingComponent.entities.items.length > 0) {
      InspectingComponent.entities.items[0].remove('inspecting')
    }
  }
  static attachToJustOne(entity: Entity<Components>) {
    InspectingComponent.removeFromAll()
    entity.add(new InspectingComponent())
  }

  onAttach(entity: Entity<Components>) {
    InspectingComponent.entities.add(entity)
  }
  onDetach(entity: Entity<Components>) {
    InspectingComponent.entities.remove(entity)
  }
}
