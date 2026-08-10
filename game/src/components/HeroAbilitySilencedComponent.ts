import { Component, Entity } from 'gg'

import { pulseEntityOutline } from '~/helpers/pulseEntityOutline'
import { pulseEntityScale } from '~/helpers/pulseEntityScale'
import { findAndAffectCardArtMaterial } from '~/utils/findAndAffectCardArtMaterial'
import { TrackableCollection } from '~/utils/TrackableCollection'

import { Components } from '.'

function __modfifyCardArtGrayness(
  entity: Entity<Components>,
  appearGray: boolean
) {
  if (entity.has('mesh')) {
    findAndAffectCardArtMaterial(
      entity.get('mesh'),
      mat =>
        (mat.colorMatrixStackWhole.deathGrayscale.animator.value = appearGray)
    )
  }
}

export default class HeroAbilitySilencedComponent extends Component<void> {
  static entities = new TrackableCollection<Entity<Components>>(
    'HeroAbilitySilencedComponent'
  )
  onAttach(entity: Entity<Components>) {
    HeroAbilitySilencedComponent.entities.add(entity)
    __modfifyCardArtGrayness(entity, true)
  }
  onDetach(entity: Entity<Components>) {
    HeroAbilitySilencedComponent.entities.remove(entity)
    __modfifyCardArtGrayness(entity, false)
    pulseEntityScale(entity)
    pulseEntityOutline(entity)
  }
}
