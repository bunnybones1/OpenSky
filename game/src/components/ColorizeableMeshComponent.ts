import { Component, Entity } from 'gg'

import CardArtMeshMaterial from '~/materials/CardArtMeshMaterial'
import { findAndAffectCardArtMaterial } from '~/utils/findAndAffectCardArtMaterial'
import { TrackableCollection } from '~/utils/TrackableCollection'

import { Components } from '.'
//this is to maintain the right amount of grayscale during a mesh change to/from Card and Character
const __hackyColorizeableMaterialMap = new Map<
  Entity<Components>,
  CardArtMeshMaterial
>()
export default class ColorizeableMeshComponent extends Component<
  CardArtMeshMaterial | undefined
> {
  static entities = new TrackableCollection<Entity<Components>>(
    'ColorizeableMeshComponent'
  )

  constructor() {
    super(undefined)
  }

  onAttach(entity: Entity<Components>) {
    let newMat: CardArtMeshMaterial | undefined
    findAndAffectCardArtMaterial(entity.get('mesh'), mat => (newMat = mat))
    if (newMat) {
      if (__hackyColorizeableMaterialMap.has(entity)) {
        const oldMat = __hackyColorizeableMaterialMap.get(entity)!
        if (
          newMat.colorMatrixStackWhole.deathGrayscale.animator.animatedValue !==
          oldMat.colorMatrixStackWhole.deathGrayscale.animator.animatedValue
        ) {
          newMat.colorMatrixStackWhole.deathGrayscale.animator.animatedValue =
            oldMat.colorMatrixStackWhole.deathGrayscale.animator.animatedValue
          newMat.colorMatrixStackWhole.deathGrayscale.animator.value =
            !oldMat.colorMatrixStackWhole.deathGrayscale.animator.value
        }
        newMat.colorMatrixStackWhole.deathGrayscale.animator.value =
          oldMat.colorMatrixStackWhole.deathGrayscale.animator.value
      }
      __hackyColorizeableMaterialMap.set(entity, newMat)
      if (entity.has('cardInstance') && !entity.has('heroAbility')) {
        newMat.colorMatrixStackWhole.deathGrayscale.animator.value =
          entity.get('cardInstance').state.view.markedForDeath !== undefined
      }
    }
    this.value = newMat
    ColorizeableMeshComponent.entities.add(entity)
  }

  onDetach(entity: Entity<Components>) {
    ColorizeableMeshComponent.entities.remove(entity)
  }
}
