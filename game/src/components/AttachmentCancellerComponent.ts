import { Component, Entity } from 'gg'

import { TrackableCollection } from '~/utils/TrackableCollection'

import { Components } from '.'

export default class AttachmentCancellerComponent extends Component<void> {
  static entities = new TrackableCollection<Entity<Components>>(
    'AttachmentCancellerComponent'
  )
  static removeFromAll() {
    while (AttachmentCancellerComponent.entities.items.length > 0) {
      AttachmentCancellerComponent.entities.items[0].remove(
        'attachmentCanceller'
      )
    }
  }
  onAttach(entity: Entity<Components>) {
    AttachmentCancellerComponent.entities.add(entity)
  }
  onDetach(entity: Entity<Components>) {
    AttachmentCancellerComponent.entities.remove(entity)
  }
}
