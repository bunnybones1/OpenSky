import {
  getRandom,
  removeFromArray,
  shuffleArray
} from '@opensky/shared/utils/arrayUtils'
import { BaseCard, CardLibrary } from '@skyweaver/state-metadata'
import { Scene } from 'three'

import { onGlobalUiAccessReady } from '~/utils/globalAccess'
import SafeListeners from '~/utils/helpers/SafeListeners'

import queryParams from '../../queryParams'
import DraftDealerAgent from './DraftDealerAgent'
import DraftDealerChair from './DraftDealerChair'
import { isFirstPlayer } from './draftDealerSteps/utils'
import draftMockupInternalsUI from './draftMockupInternalsUI'
import draftMockupInternalsVisuals from './draftMockupInternalsVisuals'
import { draftSettings } from './draftSettings'
import DraftState, { DraftStateCard, DraftStateEvent } from './DraftState'

export default function draftMockupInternals(scene: Scene) {
  const state = new DraftState()
  const safe = new SafeListeners()

  const cardsParam = queryParams.cards

  const avatarPool: BaseCard[] = [
    '4012',
    '3015',
    '31',
    '3045',
    '1061',
    '23',
    '2075',
    '2051',
    '1022',
    '2019'
  ]

  const eventPool: DraftStateEvent[] = [
    new DraftStateEvent(
      'lifeAuction',
      'lifeAuction A',
      "pay for a boon with your hero's life"
    ),
    new DraftStateEvent(
      'lifeAuction',
      'lifeAuction B',
      "pay for a boon with your hero's life"
    ),
    new DraftStateEvent(
      'lifeAuction',
      'lifeAuction C',
      "pay for a boon with your hero's life"
    ),
    new DraftStateEvent(
      'lifeAuction',
      'lifeAuction D',
      "pay for a boon with your hero's life"
    ),
    new DraftStateEvent(
      'lifeAuction',
      'lifeAuction E',
      "pay for a boon with your hero's life"
    ),
    new DraftStateEvent('boonChoice', 'boonChoice A', 'pick a boon'),
    new DraftStateEvent('boonChoice', 'boonChoice B', 'pick a boon'),
    new DraftStateEvent('boonChoice', 'boonChoice C', 'pick a boon'),
    new DraftStateEvent('boonChoice', 'boonChoice D', 'pick a boon'),
    new DraftStateEvent('boonChoice', 'boonChoice E', 'pick a boon'),
    new DraftStateEvent('randomizer', 'randomizer A', 'get a random boon!'),
    new DraftStateEvent('randomizer', 'randomizer B', 'get a random boon!'),
    new DraftStateEvent('randomizer', 'randomizer C', 'get a random boon!'),
    new DraftStateEvent('randomizer', 'randomizer D', 'get a random boon!'),
    new DraftStateEvent('randomizer', 'randomizer E', 'get a random boon!')
  ]

  const avatars: BaseCard[] = []
  while (
    avatars.length < draftSettings.playerCount * draftSettings.avatarsPerPack &&
    avatarPool.length > 0
  ) {
    const base = getRandom(avatarPool)
    removeFromArray(avatarPool, base)
    avatars.push(base)
  }
  for (const base of avatars) {
    state.avatarCube.add(new DraftStateCard(base, 'gold'))
  }
  const defaultCardIds: BaseCard[] = [
    '3013',
    '20000',
    '2000',
    '19',
    '20001',
    '3003'
    // '3002',
    // '29',
    // '2005',
    // '35',
    // '2008',
    // '3015',
    // '20013',
    // '3011',
    // '81',
    // '80'
  ]

  if (defaultCardIds.length < draftSettings.totalCards) {
    const cardIdPool = Array.from(CardLibrary.keys())
    while (defaultCardIds.length < draftSettings.totalCards) {
      const id = getRandom(cardIdPool)
      removeFromArray(cardIdPool, id)
      const cardType = CardLibrary.get(id)!.type
      if (
        parseInt(id) < 25000 &&
        !defaultCardIds.includes(id) &&
        (cardType === 'spell' || cardType === 'unit')
      ) {
        defaultCardIds.push(id)
      }
    }
  }

  const cardIds = cardsParam
    ? (cardsParam.split(',').filter(id => {
        return !!CardLibrary.has(id as BaseCard)
      }) as BaseCard[])
    : defaultCardIds

  shuffleArray(cardIds)

  const draftCards = cardIds.map(base => new DraftStateCard(base, 'base'))
  const numberOfPacks = draftSettings.totalCards / draftSettings.cardsPerPack
  let numberOfSilvers = numberOfPacks * draftSettings.silversPerCardPack
  let numberOfGolds = numberOfPacks * draftSettings.goldsPerCardPack
  for (const draftCard of draftCards) {
    if (numberOfGolds > 0) {
      numberOfGolds--
      draftCard.rarity = 'gold'
    } else if (numberOfSilvers > 0) {
      numberOfSilvers--
      draftCard.rarity = 'silver'
    }
  }
  shuffleArray(draftCards)

  for (const draftCard of draftCards) {
    state.cardCube.add(draftCard)
  }

  shuffleArray(eventPool)
  const draftEvents = eventPool.slice(
    0,
    draftSettings.eventsPerPack * draftSettings.playerCount
  )

  for (const draftEvent of draftEvents) {
    state.eventCube.add(draftEvent)
  }

  let cleanupVisuals: (() => void) | undefined
  if (import.meta.hot) {
    import.meta.hot.accept('./draftMockupInternalsVisuals', (mod: any) => {
      if (cleanupVisuals) {
        cleanupVisuals()
        cleanupVisuals = mod.default(scene, state, dealerChair)
      }
    })
  }
  const dealerChair: DraftDealerChair = {
    dealer: new DraftDealerAgent(state)
  }
  cleanupVisuals = draftMockupInternalsVisuals(scene, state, dealerChair)

  if (import.meta.hot) {
    import.meta.hot.accept('./DraftDealerAgent', (mod: any) => {
      if (dealerChair.dealer) {
        dealerChair.dealer.cleanup()
        dealerChair.dealer = new mod.default(state)
      }
    })
  }

  let cleanupUI: (() => void) | undefined

  onGlobalUiAccessReady().then(async ui => {
    const container = ui.getContainer('draftMockup')
    await container.ready
    container.show()
    if (import.meta.hot) {
      import.meta.hot.accept('./draftMockupInternalsUI', (mod: any) => {
        if (cleanupUI) {
          cleanupUI()
          cleanupUI = mod.default(container, state)
        }
      })
    }
    cleanupUI = draftMockupInternalsUI(container, state)
  })

  safe.listenForAdd(state.players, player => {
    if (isFirstPlayer(state, player)) {
      safe.listenToProperty(state, 'uiHorizonMode', mode => {
        player.lookingAt = mode === 'deckReader' ? 'deck' : 'none'
      })
      safe.listenToProperty(player, 'lookingAt', lookingAt => {
        if (lookingAt === 'deck') {
          state.uiHorizonMode = 'deckReader'
        } else if (state.uiHorizonMode === 'deckReader') {
          state.uiHorizonMode = 'sidebar'
        }
      })
    }
  })

  return function cleanup() {
    safe.cleanup()
    if (cleanupVisuals) {
      cleanupVisuals()
      cleanupVisuals = undefined
    }
    if (dealerChair.dealer) {
      dealerChair.dealer.cleanup()
      dealerChair.dealer = undefined
    }
    if (cleanupUI) {
      cleanupUI()
      cleanupUI = undefined
    }
  }
}
