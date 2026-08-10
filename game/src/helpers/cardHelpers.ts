import { BaseCard, Player, Rarity, Trait } from '@skyweaver/state-metadata'
import { Entity } from 'gg'

import { toggleCardBase } from '~/assemblages/CardAssemblage'
import { Components } from '~/components'
import { RelaxedCardInstance } from '~/components/CardInstanceComponent'
import FakeHasAttachmentComponent from '~/components/FakeHasAttachmentComponent'
import HolographicComponent from '~/components/HolographicComponent'
import { createCard } from '~/factories/CardFactory'
import { createCharacter } from '~/factories/CharacterFactory'
import { createEventCard } from '~/factories/EventCardFactory'
import { storeHelper } from '~/state/index'
import { createCardInstanceFromID, getFakeCardTagView } from '~/utils/card'

import { tryAttachBakedAttachedSpell } from './fakeAttachedSpellHelper'
import { SimpleRewardCard } from './typeHelpers'

function createCardFromId(
  id: BaseCard,
  type: 'card' | 'character' | 'hero' | 'event',
  traits?: Trait[],
  rarity: Rarity = 'base',
  unique = false
): Entity<Components> | undefined {
  let view: RelaxedCardInstance | undefined
  try {
    view = getFakeCardTagView(
      type === 'hero' ? 'Hero' : id,
      rarity,
      traits,
      unique
    )
  } catch (e) {
    console.warn(e)
    return undefined
  }
  if (view) {
    const entity = (() => {
      switch (type) {
        case 'card':
          return createCard(view, true)
        case 'event':
          return createEventCard(view, true)
        default:
          return createCharacter(view)
      }
    })()

    return entity
  }

  return undefined
}

export function createCardFromCardView(
  view: RelaxedCardInstance,
  type: 'card' | 'character' | 'hero' | 'event'
): Entity<Components> | undefined {
  const entity = (() => {
    switch (type) {
      case 'card':
        return createCard(view, true)
      case 'event':
        return createEventCard(view, true)
      default:
        return createCharacter(view)
    }
  })()

  return entity
}

export function createBaseRarityCardFromId(
  id: BaseCard,
  type: 'card' | 'character' | 'hero',
  traits?: Trait[]
): Entity<Components> | undefined {
  return createCardFromId(id, type, traits, 'base')
}

export function getOwner(mine: boolean) {
  return (
    mine ? storeHelper.getPlayer() : 1 - storeHelper.getPlayer()
  ) as Player
}

export function makeCardEntitiesFromSimpleRewards(
  rewards: SimpleRewardCard[],
  zone:
    | 'ConquestPotentialReward'
    | 'ConquestReward'
    | 'DisabledReward'
    | 'Reward',
  holographic = false
) {
  return rewards.map(reward => {
    const cardID = reward.id

    const view = createCardInstanceFromID(cardID)
    view.state.view.rarity = reward.rarity
    const entity = createCard(view, true)
    const zoneComp = entity.get('zone')
    zoneComp.setOwner('Player')
    zoneComp.setUserZone(zone)

    if (holographic) {
      entity.add(new HolographicComponent())
    }

    toggleCardBase(entity, true)

    const tc = entity.get('transform')
    const mc = entity.get('mesh')
    const didAttachSpell = tryAttachBakedAttachedSpell(
      view,
      'fake',
      tc,
      mc,
      getOwner(true)
    )
    if (didAttachSpell) {
      entity.toggle(FakeHasAttachmentComponent, true)
    }

    return entity
  })
}
