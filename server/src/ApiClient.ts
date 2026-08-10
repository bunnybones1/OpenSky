import {
  GameMode,
  InternalAppendMatchArchiveRecordsArgs,
  InternalAppendMatchArchiveRecordsReturn,
  InternalMatchEndReturn,
  MatchEndRequest,
  MatchStatus,
  SkyWeaverAPI,
  WebRPCError
} from '@opensky/proto'
import { BotMatchEndReturn } from '@opensky/proto'
import { Player } from '@skyweaver/state-metadata'

import { Config } from './utils/config'
import { logger } from './utils/logger'
import { releaseVersion } from './utils/releaseVersion'
import type { Match } from './worker/match/Match'

const fetch = global.fetch

export class ApiClient {
  client: SkyWeaverAPI
  authHeaders: {
    Authorization: string
    Release: string
  }

  constructor(config: Config['services']['openskyAPI']) {
    this.authHeaders = {
      Authorization: `BEARER ${config.authToken}`,
      Release: releaseVersion
    }
    this.client = new SkyWeaverAPI(config.uri, (a, b) => fetch(a, b))
    this.ping()
  }

  ping = async () => {
    await this.client
      .ping(this.authHeaders)
      .then(_ => logger.info('SKYWEAVER API CONNECTED'))
      .catch(error => logger.error('SKYWEAVER API CONNECTION FAILED', error))
  }

  getSpectateCode = async (address: string) =>
    this.client
      .internalGetPrivateSpectateCode({ address }, this.authHeaders)
      .then(c => c.code)
      .catch(error => {
        logger.error('FAILED TO FETCH SPECTATE CODE', error, {
          result: 'FAILED',
          address
        })
        return null
      })

  appendMatchRecord = async (
    matchID: number,
    index: number,
    message: string
  ): Promise<InternalAppendMatchArchiveRecordsReturn | null> => {
    const req: InternalAppendMatchArchiveRecordsArgs = {
      matchID,
      index,
      jsonStringData: message
    }

    return this.client
      .internalAppendMatchArchiveRecords(req, this.authHeaders)
      .then(resp => {
        return resp
      })
      .catch(error => {
        logger.error('RECORD MATCH LOG FAILED', error, {
          result: 'FAILED',
          matchID
        })
        return null
      })
  }

  recordMatchEnd = (
    match: Match,
    winner: Player | undefined,
    status: MatchStatus
  ): Promise<InternalMatchEndReturn | BotMatchEndReturn | Error> => {
    const metrics: { [key: string]: any } = {}

    let end
    if (
      (match.gameMode === GameMode.PRACTICE_BOT ||
        match.gameMode === GameMode.WARM_UP) &&
      match.botStates.some(s => s !== undefined)
    ) {
      const nonBotPlayer = match.playerContexts.find(p => !p.botState)
      if (!nonBotPlayer) {
        throw new Error('Both players are bots!')
      }
      // Guaranteed to be > -1
      const nonBotPlayerIndex = match.playerContexts.indexOf(nonBotPlayer)

      // Bot matches assume real player is always p1
      const winningPlayer =
        winner === undefined ? 0 : nonBotPlayerIndex === winner ? 1 : 2
      end = this.client.botMatchEnd(
        {
          req: {
            mode: match.gameMode,
            metrics,
            status,
            turnNonce: match.lastTurnNonce,
            winningPlayer,
            deckString: nonBotPlayer.realDeckString ?? '',
            playerSessionId: nonBotPlayer.playerSessionID,
            matchStartedAt: match.startTime,
            playerAddress: nonBotPlayer.id!,
            playerQuestProgressUpdates:
              match.quests[nonBotPlayerIndex].getProgressThisMatch()
          }
        },
        this.authHeaders
      )
    } else {
      const req: MatchEndRequest = {
        matchID: match.id,
        status,
        player1DeckString: match.playerContexts[0].realDeckString ?? '',
        player2DeckString: match.playerContexts[1].realDeckString ?? '',
        winningPlayer: winner === undefined ? 0 : 1 + winner,
        turnNonce: match.lastTurnNonce,
        metrics,
        endedAt: new Date().toISOString(),
        player1Moves: match.playerContexts[0].moveCount,
        player2Moves: match.playerContexts[1].moveCount,
        // analytics session ids
        player1SessionId: match.playerContexts[0].playerSessionID,
        player2SessionId: match.playerContexts[1].playerSessionID,
        player1QuestProgressUpdates: match.quests[0].getProgressThisMatch(),
        player2QuestProgressUpdates: match.quests[1].getProgressThisMatch()
      }

      end = this.client.internalMatchEnd({ req }, this.authHeaders)
    }
    return end
      .then(resp => {
        logger.info('RECORD MATCH RESULTS SUCCESS', {
          result: 'SUCCESS',
          matchID: match.id,
          status,
          resp
        })
        return resp
      })
      .catch(error => {
        logger.error(
          'RECORD MATCH RESULTS FAILED',
          { error },
          {
            result: 'FAILED',
            matchID: match.id,
            status
          }
        )

        const errorMsg = (error as WebRPCError).msg

        if (errorMsg) {
          return new Error(errorMsg)
        } else if (error instanceof Error) {
          return error
        } else {
          return new Error('unable to record match results')
        }
      })
  }
}
