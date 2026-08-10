import { Component, Entity } from 'gg'
import { Object3D } from 'three'

import { TrackableCollection } from '~/utils/TrackableCollection'

import { Components } from '.'

export default class MeshComponent extends Component<Object3D> {
  static entities = new TrackableCollection<Entity<Components>>('MeshComponent')

  constructor(
    mesh: Object3D,
    public leaveHierarchyAlone = false
  ) {
    super(mesh)
  }

  onAttach(entity: Entity<Components>) {
    MeshComponent.entities.add(entity)
    if (!entity.has('transform')) {
      console.warn('MeshComponent requires a TransformComponent!')
    }
    if (!this.leaveHierarchyAlone) {
      if (entity.has('transform')) {
        entity.get('transform').add(this.value)
        this.value.traverse(child => {
          if ((child as any).onAdd) {
            ;(child as any).onAdd()
          }
        })
      }
    }
  }

  onDetach(entity: Entity<Components>) {
    MeshComponent.entities.remove(entity)
    if (this.value.parent) {
      if (!this.leaveHierarchyAlone) {
        this.value.parent.remove(this.value)
        this.value.traverse(child => {
          if ((child as any).onRemove) {
            ;(child as any).onRemove()
          }
          // if ((child as any).material && (child as any).material.dispose) {
          //   ;(child as any).material.dispose()
          // }
        })
      }
    }
  }
}
