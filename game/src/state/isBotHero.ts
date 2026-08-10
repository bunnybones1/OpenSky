import { GameMode } from '@opensky/proto'

import { gameMode } from '~/helpers/envGameModeHelpers'
import queryParams from '~/queryParams'

import { isBot } from './isBot'

export function isBotHero(player: number) {
  return Boolean(
    isBot(player) &&
      !queryParams.botUsesHeroArt &&
      gameMode !== GameMode.TUTORIAL
  )
}
