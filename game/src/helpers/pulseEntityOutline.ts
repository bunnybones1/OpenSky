import { Entity } from 'gg'

import { Components } from '~/components'

export function pulseEntityOutline(entity: Entity<Components>) {
  if (entity.has('interactiveIndicators')) {
    const ii = entity.get('interactiveIndicators')!
    ii.holdingState.durationMSOut = 2000
    ii.holdingState.pulseFull()
  }
}
