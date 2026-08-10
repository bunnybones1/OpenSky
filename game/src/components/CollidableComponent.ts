import { Component, Entity } from 'gg'
import { Object3D } from 'three'

import { RENDER_ORDERS } from '~/constants'
import { isOrHasChild } from '~/utils/threeUtils'
import { TrackableCollection } from '~/utils/TrackableCollection'

import { Components } from '.'

export default class CollidableComponent extends Component<Object3D> {
  static entities = new TrackableCollection<Entity<Components>>(
    'CollidableComponent'
  )
  constructor(baseObject: Object3D, collider: Object3D, force = false) {
    if (!collider || (!isOrHasChild(baseObject, collider) && !force)) {
      throw new Error(
        'The provided collider is not a child or subchild of the baseObject'
      )
    }
    collider.renderOrder = RENDER_ORDERS.debug
    // collider.visible = false
    super(collider)
  }
  onAttach(entity: Entity<Components>) {
    CollidableComponent.entities.add(entity)
  }
  onDetach(entity: Entity<Components>) {
    CollidableComponent.entities.remove(entity)
  }
}
