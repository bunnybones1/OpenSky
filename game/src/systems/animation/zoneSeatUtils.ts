import { Entity } from 'gg'

import { Components } from '~/components'
import { Seat } from '~/components/CardZoneComponent'
import { copyTransform } from '~/utils/transformUtils'

import { animateTransformToTarget, TargetTransform } from './transform'

export function isTransformAnimating(entity: Entity<Components>) {
  if (!entity.has('isAnimating')) {
    return false
  }
  const anim = entity.get('isAnimating')
  return anim.isTransformAnimation && !anim.animationFull.inDelay
}

export function isThisSeatRelevant(entity: Entity<Components>, seat: Seat) {
  return entity.has('zone') && entity.get('zone').current.seat === seat
}

export function moveSeat(seat: Seat, target?: TargetTransform, duration = 500) {
  if (!target || !seat.entity.has('transform')) {
    return
  }
  const entTransform = seat.entity.get('transform')
  if (seat.isNew) {
    copyTransform(seat, target)
  }
  seat.animation = animateTransformToTarget(
    seat,
    target,
    seat.isNew ? 0 : duration,
    undefined,
    () => {
      if (
        !isTransformAnimating(seat.entity) &&
        isThisSeatRelevant(seat.entity, seat)
      ) {
        copyTransform(entTransform, seat)
      }
    }
  )
  seat.isNew = false
}
