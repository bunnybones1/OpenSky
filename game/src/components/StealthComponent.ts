import { Component, Entity } from 'gg'

import CardArtMeshMaterial from '~/materials/CardArtMeshMaterial'
import { TrackableCollection } from '~/utils/TrackableCollection'

import { Components } from '.'

class Stealth {
  material: CardArtMeshMaterial | undefined
  set unveiled(state: boolean) {
    if (this.material) {
      this.material.stealthVulnerability.value = state
      this.material.colorMatrixStackFg.stealthChange.animator.pulseFull()
    }
  }
}

export default class StealthComponent extends Component<Stealth> {
  static entities = new TrackableCollection<Entity<Components>>(
    'StealthComponent'
  )
  constructor() {
    super(new Stealth())
  }

  onAttach(entity: Entity<Components>) {
    StealthComponent.entities.add(entity)
  }

  onDetach(entity: Entity<Components>) {
    StealthComponent.entities.remove(entity)
  }
}
