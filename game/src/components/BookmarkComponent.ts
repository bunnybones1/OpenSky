import { Component, Entity } from 'gg'

import { TrackableCollection } from '~/utils/TrackableCollection'

import { Components } from '.'

export default class BookmarkComponent extends Component<void> {
  static entities = new TrackableCollection<Entity<Components>>(
    'BookmarkComponent'
  )
  onAttach(entity: Entity<Components>) {
    BookmarkComponent.entities.add(entity)
  }
  onDetach(entity: Entity<Components>) {
    BookmarkComponent.entities.remove(entity)
  }
}
