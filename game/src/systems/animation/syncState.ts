import { Entity } from 'gg'

import { CardCacheWithEntities } from '~/cardCache'
import { Components } from '~/components'
import { removeWorldEntity } from '~/helpers/worldHelpers'
import { matchInfoStore } from '~/state/stores/MatchInfoStore'
import { world } from '~/world'

import ChooseSystem from '../cardPositioning/ChooseSystem'
import { resetTargetsCounter } from '../input/StateInteractions'

export function onSetup() {
  matchInfoStore.settingConcedeButtonEnabled = true

  // clear event tracking storage
  window.localStorage.removeItem('requestGameTimestampSec')
  window.localStorage.removeItem('requestGameMode')
}

/**
 *  Only call this when there are *no* events left in the queue!!
 */
export function resetEverything(cardCache: CardCacheWithEntities) {
  if (world.hasSystem(ChooseSystem)) {
    world.getSystem(ChooseSystem).resetChooseState()
  }

  const entities: Array<Entity<Components>> = []
  cardCache.forEachEntity(entity => {
    entities.push(entity)
  })
  cardCache.clear()

  // Remove all card entities and clear cards
  entities.forEach(entity => {
    // remove card first so it doesn't try to regen
    entity.remove('card')
  })
  entities.forEach(entity => {
    // remove zone so nothing can move it
    entity.remove('transform')
  })
  entities.forEach(entity => {
    // remove zone so it doesn't try to reposition
    entity.remove('zone')
  })

  entities.forEach(entity => {
    removeWorldEntity(entity.id)
  })

  resetTargetsCounter()
}
