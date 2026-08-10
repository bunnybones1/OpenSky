import { getPrematchConquestProgress } from './helpers/conquestProgressHelpers'
import { isConquestGame } from './helpers/envGameModeHelpers'
import queryParams from './queryParams'

export const isConquestIsland =
  queryParams.island?.includes('Conquest') || isConquestGame

export const getArenaSettings = async () => {
  const DEFAULT_GAME_BOARD_MODEL = isConquestIsland
    ? 'gameBoardConquestModel'
    : 'gameBoardBasicModel'
  const i = await getPrematchConquestProgress().then(p => p.currentMatch + 1)
  const DEFAULT_ISLAND_MODEL = isConquestGame
    ? `islandConquest${i}Model`
    : 'islandBasicModel'
  const arenaSettings = {
    gameBoard: queryParams.gameBoard
      ? `gameBoard${queryParams.gameBoard}Model`
      : DEFAULT_GAME_BOARD_MODEL,
    island: queryParams.island
      ? `island${queryParams.island}Model`
      : DEFAULT_ISLAND_MODEL
  }
  return arenaSettings
}
