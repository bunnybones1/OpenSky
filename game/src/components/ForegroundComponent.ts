import { Component, Entity } from 'gg'

import { TrackableCollection } from '~/utils/TrackableCollection'

import { Components } from '.'

export default class ForegroundComponent extends Component<void> {
  static entities = new TrackableCollection<Entity<Components>>(
    'ForegroundComponent'
  )
  childComponent: ForegroundComponent | undefined = undefined
  onAttach(entity: Entity<Components>) {
    ForegroundComponent.entities.add(entity)
    if (entity.has('hostingAttachment')) {
      const child = entity.get('hostingAttachment').entity
      child.toggle(ForegroundComponent, true)
      this.childComponent = child.getComponent('foreground')
    }
  }
  onDetach(entity: Entity<Components>) {
    ForegroundComponent.entities.remove(entity)
    if (entity.has('hostingAttachment')) {
      const child = entity.get('hostingAttachment').entity
      if (
        child.has('foreground') &&
        child.getComponent('foreground') === this.childComponent
      ) {
        child.remove('foreground')
      }
    }
    this.childComponent = undefined
  }
}
