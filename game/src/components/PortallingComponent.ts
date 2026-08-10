import { Component, Entity } from 'gg'

import { TrackableCollection } from '~/utils/TrackableCollection'

import { Components } from '.'

export default class PortallingComponent extends Component<void> {
  static entities = new TrackableCollection<Entity<Components>>(
    'PortallingComponent'
  )
  onAttach(entity: Entity<Components>) {
    PortallingComponent.entities.add(entity)
    if (entity.has('hostingAttachment')) {
      entity.get('hostingAttachment').entity.toggle(PortallingComponent, true)
    }
  }
  onDetach(entity: Entity<Components>) {
    PortallingComponent.entities.remove(entity)
    if (entity.has('hostingAttachment')) {
      entity.get('hostingAttachment').entity.remove('portalling')
    }
  }
}
