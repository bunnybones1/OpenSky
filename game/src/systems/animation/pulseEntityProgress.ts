import { Entity } from 'gg'

import { Components } from '~/components'
import { findAndAffectCardArtMaterial } from '~/utils/findAndAffectCardArtMaterial'

export function pulseEntityProgress(entity: Entity<Components>) {
  if (entity.has('mesh')) {
    findAndAffectCardArtMaterial(entity.get('mesh'), mat =>
      mat.colorMatrixStackFg.heroAbilityProgressing.animator.pulseFull()
    )
  }
}
