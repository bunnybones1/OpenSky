import { Component, Entity } from 'gg'

import { TrackableCollection } from '~/utils/TrackableCollection'

import { Components } from '.'

type E = Entity<Components>

interface SelectableValue {
  onSelect: (selected: E) => void
}

export default class SelectableComponent extends Component<SelectableValue> {
  constructor(onSelect: (selected: E) => void) {
    super({
      onSelect
    })
  }
  static entities = new TrackableCollection<Entity<Components>>(
    'SelectableComponent'
  )
  onAttach(entity: Entity<Components>) {
    SelectableComponent.entities.add(entity)
  }
  onDetach(entity: Entity<Components>) {
    SelectableComponent.entities.remove(entity)
  }
}
