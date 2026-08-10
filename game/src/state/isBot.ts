import { isBotGame } from '~/helpers/envGameModeHelpers'

import { storeHelper } from './index'

export function isBot(player: number) {
  return Boolean(isBotGame && storeHelper.getPlayer() !== player)
}
