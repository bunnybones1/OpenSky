import {
  listenToProperty,
  stopListeningToProperty
} from '@opensky/shared/utils/propertyListeners'
import { Entity, System } from 'gg'

import { getPrismsForCard } from '~/assemblages/getPrismsForCard'
import { Components } from '~/components'
import FrameStyleComponent from '~/components/FrameStyleComponent'
import { getCardBack } from '~/helpers/cardBacks'
import {
  entitiesWithFrameStyleAndMesh,
  entitiesWithFrameStyleAndMeshOwnedByOpponent,
  entitiesWithFrameStyleAndMeshOwnedByPlayer,
  holographicCards,
  nonHolographicCards
} from '~/helpers/compoundCollections'
import { shouldBeBackless } from '~/helpers/shouldBeBackless'
import { store } from '~/state/index'
import { adjustHolographicMaterial } from '~/utils/adjustHolographicMaterial'
import { changeFrameRarity } from '~/utils/changeFrameRarity'

export default class FrameStyleSystem extends System<Components> {
  listeners: Map<Entity<Components>, [FrameStyleComponent, () => void]> =
    new Map()
  init() {
    const onStyleChange = (entity: Entity<Components>) => {
      if (entity.has('mesh') && entity.has('frameStyle')) {
        const rarity = entity.get('frameStyle')
        if (!entity.has('holographic')) {
          const cardIsKnown = entity.has('cardInstance')
          let hasPrism = cardIsKnown
          if (cardIsKnown) {
            const card = entity.get('cardInstance')
            let prism = getPrismsForCard(
              card,
              entity.has('player') ? store.player! : 1 - store.player!
            )[0]
            if (prism === 'tut') {
              prism = 'tok'
            }
            if (prism === 'tok') {
              hasPrism = false
            }
          }
          changeFrameRarity(
            entity.get('mesh'),
            rarity,
            entity.has('publicRarity'),
            hasPrism,
            shouldBeBackless(entity)
          )
        } else {
          adjustHolographicMaterial(entity.get('mesh'), rarity)
        }
      } else {
        console.warn('bailing due to missing mesh or frameStyle')
      }
    }

    entitiesWithFrameStyleAndMesh.listenForAdd((entity: Entity<Components>) => {
      const frameStyleComponent = entity.getComponent('frameStyle')!
      function boundStyleChange() {
        onStyleChange(entity)
      }
      listenToProperty(frameStyleComponent, 'value', boundStyleChange)

      this.listeners.set(entity, [frameStyleComponent, boundStyleChange])
    })
    entitiesWithFrameStyleAndMesh.listenForRemove(e => {
      if (this.listeners.has(e)) {
        const [frameStyleComponent, valueChangedCallback] =
          this.listeners.get(e)!

        stopListeningToProperty(
          frameStyleComponent,
          'value',
          valueChangedCallback
        )

        this.listeners.delete(e)
      }
    })
    holographicCards.listenForAdd(onStyleChange)
    nonHolographicCards.listenForAdd(onStyleChange)

    function playerChangeHandler(e: Entity<Components>) {
      if (getCardBack(0) !== getCardBack(1)) {
        onStyleChange(e)
      }
    }
    entitiesWithFrameStyleAndMeshOwnedByPlayer.listenForAdd(playerChangeHandler)
    entitiesWithFrameStyleAndMeshOwnedByOpponent.listenForRemove(
      playerChangeHandler
    )
  }
  update() {
    //nothing
  }
}
