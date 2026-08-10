import { prismsToDeckClass } from '@opensky/shared/helpers'
import {
  CardInstance,
  isHero,
  Player,
  SkyWeaver
} from '@skyweaver/state-metadata'

import { getCardCache } from '~/cardCache'
import { RelaxedCardInstance } from '~/components/CardInstanceComponent'
import { store } from '~/state'
import { isBotHero } from '~/state/isBotHero'

import ActionHistorySidebar from '.'
import { enemyColor, playerColor } from './constants'

export const getPlayerColor = (playerId: Player) =>
  store.player === playerId ? playerColor : enemyColor

export const getCardOwner = (card: CardInstance<SkyWeaver>): Player => {
  const location = getCardCache().getLocation(card)
  if (location) {
    return location.player
  } else {
    return (1 - store.player!) as Player
  }
}

export type ToggleCallback = (sidebar: ActionHistorySidebar) => void
export type AnimationCallback = (progress: number, dist: number) => void

export const getThumbnail = (card: RelaxedCardInstance) => {
  const thumbnailId = isHero(card)
    ? isBotHero(card.id)
      ? 'BOT'
      : prismsToDeckClass(store.state!.state.players[card.id].prisms)
    : card.base
  return `game/cards/thumbs/${thumbnailId}.png`
}
