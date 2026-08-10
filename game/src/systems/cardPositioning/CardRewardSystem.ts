import { delayPromise } from '@opensky/shared/utils/async'
import { getUrlInt } from '@opensky/shared/utils/location'
import { Entity, System } from 'gg'
import { Vector3 } from 'three'

import { Components } from '~/components'
import FlippedComponent from '~/components/FlippedComponent'
import FloatationComponent from '~/components/FloatationComponent'
import FrontFacesVisibleComponent from '~/components/FrontFacesVisibleComponent'
import HolographicComponent from '~/components/HolographicComponent'
import SelectableComponent from '~/components/SelectableComponent'
import { REWARD_FLOTATION_SPEED } from '~/constants'
import { playSound } from '~/helpers/soundHelpers'
import { removeWorldEntity } from '~/helpers/worldHelpers'
import { ownedZoneCollections } from '~/helpers/zoneCollections'
import AnimatedNumber from '~/utils/AnimatedNumber'
import { animationDelay } from '~/utils/asyncUtils'
import { globalAccess } from '~/utils/globalAccess'
import { removeFromParent } from '~/utils/threeUtils'

import { animateTransformToTarget } from '../animation/transform'

const rewardCards = ownedZoneCollections.Player_Reward.union(
  ownedZoneCollections.Player_ConquestReward
).exclude(HolographicComponent.entities)
const leftToFlip = rewardCards.exclude(FlippedComponent.entities)

let __offset = 0

export default class CardRewardSystem extends System<Components> {
  current: Entity<Components>
  nuked: Set<number> = new Set()
  flippingAllCards: boolean = false
  allFlippedCallback: () => void

  init() {
    rewardCards.listenForAdd(entity => {
      entity.add(
        new FloatationComponent(
          new Vector3(0, 0.005, 0),
          REWARD_FLOTATION_SPEED,
          (__offset -= 0.2)
        )
      )

      if (!entity.has('frontFacesVisible')) {
        entity.add(new FrontFacesVisibleComponent())
      }

      // Wait before adding click handler to cards so they cant be revealed too early
      setTimeout(() => {
        if (rewardCards.items.includes(entity)) {
          entity.add(new SelectableComponent(this.flipCard.bind(this)))
        }
      }, 400)

      if (!entity.has('holographic')) {
        playSound('audioFxMatchEnd', 'CardUnlock')
      }
    })
    rewardCards.listenForRemove(entity => {
      entity.remove('selectable')

      if (entity.has('floatation')) {
        entity.remove('floatation')
      }
    })

    this.disable()
  }

  get allFlipped() {
    return new Promise<void>(resolve => {
      leftToFlip.listenForRemove(() => {
        if (rewardCards.items.length > 0) {
          if (leftToFlip.items.length === 0) {
            resolve()
          }
        }
      })
      if (leftToFlip.length === 0) {
        resolve()
      }
    })
  }

  async flipCard(entity: Entity<Components>) {
    if (entity.has('flipped') || this.nuked.has(entity.id)) {
      return
    }
    animationDelay(70).then(() => {
      entity.remove('holographic')
    })

    const rarity = entity.has('cardInstance')
      ? entity.get('cardInstance').state.view.rarity
      : 'base'

    if (rarity === 'gold') {
      playSound('audioFxMatchEnd', 'CardRevealGold')
    } else if (rarity === 'silver') {
      playSound('audioFxMatchEnd', 'CardRevealSilver')
    } else {
      playSound('audioFxMatchEnd', 'CardReveal')
    }

    entity.add(new FlippedComponent())

    const rewards = globalAccess.ui!.getContainer('rewardCard')
    await rewards.ready
    if (rewards.prisms) {
      const anim = new AnimatedNumber(v => {
        for (const p of rewards.prisms) {
          p.matrix.opacity = v
        }
      }, 1)
      await anim.animateToValue(0, 500)
      for (const p of rewards.prisms) {
        removeFromParent(p)
      }
    }
  }

  update() {
    //
  }

  async flipAll() {
    if (this.flippingAllCards) {
      return
    }

    const entities = rewardCards.items.slice()

    const entitiesToFlip = entities.filter(entity => !entity.has('flipped'))

    this.flippingAllCards = true

    const flipPromises = entitiesToFlip.map(async (entity, index) => {
      await delayPromise(index * getUrlInt('rewardFlipDelay', 200))
      this.flipCard(entity)
    })

    await Promise.all(flipPromises)

    this.flippingAllCards = false
  }

  nukeAll() {
    const entities = rewardCards.items.slice().reverse()

    if (this.nuked.size < entities.length) {
      const entitiesToFlip = entities.filter(
        entity => !this.nuked.has(entity.id)
      )

      for (const entity of entitiesToFlip) {
        const transform = entity.get('mesh')
        const scale = new Vector3(0.001, 0.001, 0.001)

        this.nuked.add(entity.id)
        animationDelay(1500).then(() =>
          animateTransformToTarget(
            transform,
            {
              position: transform.position,
              scale: scale,
              quaternion: transform.quaternion
            },
            200
          ).finished.then(() => {
            removeWorldEntity(entity.id)
            this.nuked.delete(entity.id)
          })
        )
      }
    }
  }
}
