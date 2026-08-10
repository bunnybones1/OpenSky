import { GameMode, Hero } from '@opensky/proto'
import { BASE_HERO_SKINS, DECKCLASS_HEROES } from '@opensky/shared/constants'
import { HeroSkin } from '@opensky/shared/constants'
import { HeroSkinLibrary } from '@opensky/shared/cosmetics'
import { prismsToDeckClass } from '@opensky/shared/helpers'
import { Card, CardLibrary, Player, Prism } from '@skyweaver/state-metadata'

import { getCardCache } from '~/cardCache'
import { debugAccounts } from '~/debugAccounts'
import { accountsStore } from '~/state/AccountStore'
import { storeHelper } from '~/state/index'
import { getTutorial } from '~/tutorial/Tutorial'

import { gameMode } from './envGameModeHelpers'

export function getHeroSkin(
  cardOrPlayer: Card | Player,
  prisms?: Prism[]
): HeroSkin {
  let player: Player
  switch (typeof cardOrPlayer) {
    case 'object': {
      const location = getCardCache().getLocation(cardOrPlayer)
      if (location) {
        player = location.player
      } else {
        throw new Error('tried to get hero assets for card not in cache')
      }
      break
    }
    case 'number': {
      player = cardOrPlayer
      break
    }
  }

  if (
    !storeHelper.useFakeStoreData &&
    gameMode === GameMode.TUTORIAL &&
    player == 1 // is the bot, player is p0 in tutorial
  ) {
    const artCard = getTutorial()?.config.botArt
    const c = artCard && CardLibrary.get(artCard)
    if (c) {
      return {
        artID: c.artSlug,
        bgID: c.backgroundArtSlug,
        flavorText: '',
        grade: 'base',
        id: -25,
        hero: Hero.UNKNOWN,
        name: ''
      }
    }
  }

  const accounts = storeHelper.useFakeStoreData
    ? debugAccounts
    : accountsStore.accounts
  if (accounts) {
    const skinID = accounts[player].deckEquipment?.heroSkin || null
    const hero =
      DECKCLASS_HEROES[prismsToDeckClass(prisms ?? accounts[player].prisms)]
    const thisSkin = [...HeroSkinLibrary.values()].find(
      skin => skinID == skin.id
    )
    return thisSkin || BASE_HERO_SKINS[hero] || BASE_HERO_SKINS.UNKNOWN
  } else {
    return BASE_HERO_SKINS.UNKNOWN
  }
}
