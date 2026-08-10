import { GameMode, MatchStatus } from '@opensky/proto'
import { gameStateStringify } from '@opensky/shared/gameStateSerializer'
import { PlayerCreatedLethalPuzzleConfig } from '@opensky/shared/tutorialConfig'
import { Player } from '@skyweaver/state-metadata'

import { downloadJson } from '~/utils/jsonDownloader'

import { store } from '.'
import { ReplayPlayer } from './StateSharedTypes'

export interface Frame {
  time: number
  type: 'internal' | 'playerAction' | 'playerActionEndTurn' | 'emote'
}

export interface Record {
  id: number
  name: string
  rootProof: string
  frames: Frame[]
  firstFrameTime: number
  players: [ReplayPlayer, ReplayPlayer]
  localPlayer: Player
  status: MatchStatus
  winningPlayer: number | undefined
  gameMode: GameMode
  replayID: string
  version: string
}

export default class StateRecorder {
  static async download() {
    const serializedGame = await store.serializeBotGame()
    downloadJson(
      gameStateStringify(serializedGame.game),
      'serialized_match.json'
    )
  }
  static async quickSave() {
    const serializedGame = await store.serializeBotGame()
    return gameStateStringify(serializedGame.game)
  }
  static async downloadAsPuzzle(title: string, description: string) {
    const serializedGame = await store.serializeBotGame()
    // Always set turn count to zero, so passing makes you lose.
    serializedGame.game.state.state.turnCount = 0
    // disable cheats
    serializedGame.game.state.state.gameParams.cheatsAllowed = false
    const puzzle: PlayerCreatedLethalPuzzleConfig = {
      setup: gameStateStringify(serializedGame.game),
      stateVersion: serializedGame.version,
      title,
      description
    }
    const filename = encodeURIComponent(`puzzle_${title}.json`)
    downloadJson(JSON.stringify(puzzle), filename)
  }
  record: Record | undefined
}
