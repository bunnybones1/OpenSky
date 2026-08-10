import { Entity } from 'gg'

import { Components } from '~/components/index'

import { getCardBack } from './cardBacks'
import { getOwner } from './cardHelpers'

export function shouldBeBackless(entity: Entity<Components>) {
  return (
    !!getCardBack(getOwner(entity.has('player'))) &&
    (!entity.has('zone') || entity.get('zone').userZone !== 'Reward')
  )
}
