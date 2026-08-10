import { Component, Entity } from 'gg'
import { Euler, Object3D, Quaternion, Scene, Vector3 } from 'three'

import { timeStamp } from '~/animationTime'
import { removeWorldEntity } from '~/helpers/worldHelpers'
import { removeFromParent } from '~/utils/threeUtils'
import { TrackableCollection } from '~/utils/TrackableCollection'

import { world } from '../world'
import { Components } from '.'

export default class TransformComponent extends Component<Object3D> {
  static entities = new TrackableCollection<Entity<Components>>(
    'TransformComponent'
  )
  static defaultScene: Scene

  constructor(
    data: Partial<{
      obj3D: Object3D
      position: Vector3
      quaternion: Quaternion
      scale: Vector3
      rotation: Euler
      parentID: number
      name: string
    }> = {},
    altScene?: Scene
  ) {
    const value = data.obj3D || new Object3D()
    value.userData.timeOfBirth = timeStamp()
    value.name = 'Transform - ' + (data.name || 'unnamed')

    if (data.position) {
      value.position.copy(data.position)
    }

    if (data.quaternion) {
      value.quaternion.copy(data.quaternion)
    }

    if (data.scale) {
      value.scale.copy(data.scale)
    }

    if (data.rotation) {
      value.rotation.copy(data.rotation)
    }

    if (data.parentID) {
      const parent = world.getEntity(data.parentID)

      if (!parent || !parent.has('transform')) {
        throw new Error(`Parent doesn't have a TransformComponent`)
      }

      parent.get('transform').add(value)
    } else {
      ;(altScene || TransformComponent.defaultScene).add(value)
    }

    super(value)
  }

  onAttach(entity: Entity<Components>) {
    this.value.userData.entityId = entity.id
    TransformComponent.entities.add(entity)
  }

  onDetach(entity: Entity<Components>) {
    const eIDs = this.value.children.map(child => child.userData.entityId)
    for (const id of eIDs) {
      if (id) {
        removeWorldEntity(id)
      }
    }
    removeFromParent(this.value)
    TransformComponent.entities.remove(entity)
  }
}
