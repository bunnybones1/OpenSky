import { MatchRegistryService } from '../../services/RegistryService'
import { Config } from '../../utils/config'
import { logger } from '../../utils/logger'
import { MatchHandler } from './MatchHandler'
import { ThreadPlayerContext } from './ThreadPlayerContext'
import { MatchData } from './TransportModels'
import { post } from './utils'

export class MatchCollection {
  matches: Map<number, MatchHandler>
  lastTask: number = Date.now()
  matchesCompleted = 0

  matchRegistry: MatchRegistryService

  constructor(public config: Config) {
    this.matches = new Map()
    this.matchRegistry = new MatchRegistryService(config)
  }

  get size(): number {
    return this.matches.size
  }

  get shouldRestartThread(): boolean {
    return (
      this.matchesCompleted >= this.config.settings.worker.threadRestartInterval
    )
  }

  getMatch(matchID: number): MatchHandler | undefined {
    return this.matches.get(matchID)
  }

  deleteMatch = (matchID: number) => {
    this.matches.delete(matchID)
  }

  createMatch = (data: MatchData) => {
    const [p1, p2] = [
      new ThreadPlayerContext(
        data.matchID,
        data.player1Info.privateSeed,
        data.player1Info.gameMode,
        data.player1Info.account,
        data.player1Info.playerSessionID,
        data.player1Info.botSubkey,
        data.player1Info.quests,
        data.player1Info.conquestInfo
      ),
      new ThreadPlayerContext(
        data.matchID,
        data.player2Info.privateSeed,
        data.player2Info.gameMode,
        data.player2Info.account,
        data.player2Info.playerSessionID,
        data.player2Info.botSubkey,
        data.player2Info.quests,
        data.player2Info.conquestInfo
      )
    ]

    const onMatchStart = () => {
      post({
        type: 'internal_match_created',
        matchID: data.matchID
      })
    }

    const onMatchGameEnd = () => {
      this.matchesCompleted++
      this.matchRegistry.markMatchPendingRewards(p1.id!, p2.id!)
      post({
        type: 'internal_match_ended',
        matchID: data.matchID
      })
    }

    const onMatchRecordEnd = () => {
      post({
        type: 'internal_match_recorded',
        matchID: data.matchID
      })
      this.deleteMatch(data.matchID)
      this.matchRegistry.endMatch(data.matchID, p1.id!, p2.id!)
      if (this.shouldRestartThread && this.size === 0) {
        // signal to restart thread immediately
        post({
          type: 'thread_inactive'
        })
      } else if (this.shouldRestartThread) {
        // signal to restart thread once all matches are complete
        // sets thread status to PENDING_TERMINATION
        post({
          type: 'thread_restart_request'
        })
      }
    }

    const startAbandonCountdownForNotLoadingAssets = (match: MatchHandler) => {
      // abandon timeout
      const MATCH_EXPIRY_FROM_NOT_LOADING_ASSETS_MS =
        data.config.settings.abandonTimeout

      setTimeout(() => {
        /*
          handle the case when match is initialized but not enough players
          to start the match:

          case 1: 1 connected player when match expiry is hit
                  treat as other player's abandon condition for fairness

          case 2: 0 players connected when match expiry is hit
                  match fails to start, clear resources, no penalties

          case 3: 2 players connected when match expiry is hit, nothing happens.
          
         */

        const playersWithAssetsLoaded = match.playerContexts.filter(
          p => p.finishedLoadingAssets
        )
        if (playersWithAssetsLoaded.length === 1) {
          logger.warn('MATCH EXPIRED, ONE PLAYER IS CONNECTED.', {
            matchID: match.matchID,
            p1: p1.id,
            p2: p2.id,
            playersWithAssetsLoaded: playersWithAssetsLoaded
              .map(p => p.id)
              .join(',')
          })
          // if one player has loaded assets, the other player has abandoned.
          if (playersWithAssetsLoaded.some(p => p.id === p1.id)) {
            logger.warn('Only P1 has assets, making P2 abandon.')
            match.handleAbandonMessage(p2.id!)
            return
          }
          if (playersWithAssetsLoaded.some(p => p.id === p2.id)) {
            logger.warn('Only P2 has assets, making P1 abandon.')
            match.handleAbandonMessage(p1.id!)
            return
          }
        } else if (playersWithAssetsLoaded.length === 0) {
          // if neither player is connected, kill the game with no penalty.
          onMatchGameEnd()
          onMatchRecordEnd()
        }
      }, MATCH_EXPIRY_FROM_NOT_LOADING_ASSETS_MS)

      // abandon from not loading assets status gets cleared when players submit finished loading assets
      this.matchRegistry.setPlayerLoadingAssetsAbandonStatus(
        p1.id!,
        MATCH_EXPIRY_FROM_NOT_LOADING_ASSETS_MS / 1000
      )
      this.matchRegistry.setPlayerLoadingAssetsAbandonStatus(
        p2.id!,
        MATCH_EXPIRY_FROM_NOT_LOADING_ASSETS_MS / 1000
      )
    }

    try {
      const match = new MatchHandler(
        p1,
        p2,
        data,
        onMatchStart,
        onMatchGameEnd,
        onMatchRecordEnd,
        this.matchRegistry
      )

      match.updateMatchStatus()

      this.matches.set(data.matchID, match)

      this.matchRegistry.registerMatch(
        p1.id!,
        p2.id!,
        data.matchID,
        data.replayID,
        p1.mode
      )

      startAbandonCountdownForNotLoadingAssets(match)
    } catch (error) {
      logger.error('ERROR CREATING MATCH STORE', {
        error:
          error instanceof Error
            ? error.message
            : JSON.stringify(error, null, 2)
      })
      onMatchGameEnd()
      onMatchRecordEnd()
    }
  }
}
