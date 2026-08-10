import { Entity } from 'gg'

import { Components } from '~/components'
import IsAnimatingComponent from '~/components/IsAnimatingComponent'
import { Easing } from '~/systems/animation/Easing'
import { simpleTweener } from '~/systems/animation/tweeners'

export async function pulseEntityScale(entity: Entity<Components>) {
  if (entity.has('isAnimating')) {
    await entity.get('isAnimating')!.finishedFull
  }
  if (entity.has('mesh')) {
    const visuals = entity.get('mesh')!
    const s = visuals.scale.x * 1.25
    if (!entity.has('isAnimating')) {
      entity.add(
        new IsAnimatingComponent(
          'pulse hero ability scale',
          simpleTweener.to({
            description: 'pulse hero ability scale',
            target: visuals.scale,
            propertyGoals: { x: s, y: s, z: s },
            duration: 500,
            easing: Easing.Custom.Pulse
          })
        )
      )
    }
  }
}
