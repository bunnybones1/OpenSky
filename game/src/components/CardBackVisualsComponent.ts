import { listenToProperty } from '@opensky/shared/utils/propertyListeners'
import { Component, Entity } from 'gg'

import { TrackableCollection } from '~/utils/TrackableCollection'

import { Components } from './index'

class CardBackVisuals {
  fullness = true
  flatness = false
  entity: Entity<Components> | undefined
  visibleMeshName: string

  constructor() {
    listenToProperty(this, 'fullness', this.updateMeshName)
    listenToProperty(this, 'flatness', this.updateMeshName)
    listenToProperty(this, 'visibleMeshName', this.updateMeshVisuals)
  }

  updateMeshName = () => {
    let visibleMeshName = 'card-back'

    if (!this.fullness) {
      visibleMeshName += '-edge-only'
    } else if (this.flatness) {
      visibleMeshName += '-flat'
    }
    this.visibleMeshName = visibleMeshName
  }

  updateMeshVisuals = () => {
    if (this.entity && this.entity.has('mesh')) {
      const mesh = this.entity.get('mesh')
      const pivot = mesh.children.find(
        child => child.name === 'card-back-pivot'
      )
      if (pivot) {
        for (const child of pivot.children) {
          child.visible = child.name === this.visibleMeshName
        }
      } else {
        // throw Error('Could not find pivot')
      }
    }
  }
}

export default class CardBackVisualsComponent extends Component<CardBackVisuals> {
  static entities = new TrackableCollection<Entity<Components>>(
    'cardbackVisuals'
  )
  onAttach(entity: Entity<Components>) {
    CardBackVisualsComponent.entities.add(entity)
    this.value.entity = entity
  }
  onDetach(entity: Entity<Components>) {
    CardBackVisualsComponent.entities.remove(entity)
    this.value.entity = undefined
  }

  constructor() {
    super(new CardBackVisuals())
  }
}
