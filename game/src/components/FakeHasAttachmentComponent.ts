import { Component, Entity } from 'gg'

import { TrackableCollection } from '~/utils/TrackableCollection'

import { Components } from '.'

export default class FakeHasAttachmentComponent extends Component<void> {
  static entities = new TrackableCollection<Entity<Components>>(
    'FakeHasAttachmentComponent'
  )

  onAttach(entity: Entity<Components>) {
    FakeHasAttachmentComponent.entities.add(entity)
  }
  onDetach(entity: Entity<Components>) {
    FakeHasAttachmentComponent.entities.remove(entity)
  }
}
