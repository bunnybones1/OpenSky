import { GameMode } from '@opensky/proto'
import * as mode from '@opensky/shared/gameModes'

import queryParams from '~/queryParams'

export * from '@opensky/shared/gameModes'

export const gameMode = mode.isAnyGameMode(queryParams.mode)
  ? queryParams.mode
  : GameMode.UNKNOWN

export const isDiscoveryGame = mode.isDiscoveryGame(gameMode)
export const isBotGame = Boolean(
  mode.isBotGame(gameMode) || queryParams.serializedGameURL
)
export const isTurnTimerGame = mode.isTurnTimerGame(gameMode)
export const isOnlineGame = mode.isOnlineGame(gameMode)
export const isAuthenticatedGame = mode.isAuthenticatedGame(gameMode)
export const isReplayGame = mode.isReplayGame(gameMode)
// export const isRankedGame = mode.isRankedGame(gameMode)
export const isReplayableGame = mode.isReplayableGame(gameMode)
export const isConquestGame = mode.isConquestGame(gameMode)
export const isNoActionsGameMode = mode.isNoActionsGameMode(gameMode)
