import { WEBSOCKET_FORCED_CLOSE_CODE } from '@opensky/shared/constants'
import { MatchSettings } from '@opensky/shared/matchmaker-message-types'

import { PlayerContext } from '../PlayerContext'
import { matchbook } from '../Server'
import { MatchWorker, ThreadService } from '../services/ThreadService'
import { logger } from '../utils/logger'
import {
  MatchCreatedMessage,
  MatchEndedMessage,
  MatchRecordDoneMessage,
  MatchStatusInfoMessage,
  PlayerInformation,
  ThreadTransportMessage
} from '../worker/match/TransportModels'

export class MatchProxy {
  worker: MatchWorker
  isDead = false

  playerContexts: Map<string, PlayerContext | null>
  playerOrder: [string, string]
  spectators: Map<string, { context: PlayerContext; codes: string[] }>
  playerInfo: Map<string, PlayerInformation>

  spectateCodeInterval: any

  private _statusInfo: MatchStatusInfoMessage['info']

  constructor(
    public matchID: number,
    public replayID: string,
    p1: PlayerInformation,
    p2: PlayerInformation,
    matchSettings: MatchSettings,
    public threadService: ThreadService
  ) {
    this.playerContexts = new Map()
    this.playerInfo = new Map()
    this.spectators = new Map()
    this.playerOrder = [p1.account.address, p2.account.address]

    this.playerInfo.set(p1.account.address, p1)
    this.playerInfo.set(p2.account.address, p2)

    this.worker = this.threadService.createMatchOnWorker(
      matchID,
      replayID,
      p1,
      p2,
      matchSettings
    )

    this.worker.on('message', this.handler)

    this.worker.on('error', error =>
      logger.error('MATCH THREAD WORKER ERROR', error, { matchID })
    )

    const updateSpectateCodes = () => {
      // NOTE: skip bot accounts, as they do not exist and cannot be spectated.
      if (!p1.botSubkey) {
        this.threadService.apiClient
          .getSpectateCode(p1.account.address)
          .then(code => {
            const player = this.playerInfo.get(p1.account.address)
            if (player && code) {
              player.spectateCode = code.toLowerCase()
            }
          })
      }
      if (!p2.botSubkey) {
        this.threadService.apiClient
          .getSpectateCode(p2.account.address)
          .then(code => {
            const player = this.playerInfo.get(p2.account.address)
            if (player && code) {
              player.spectateCode = code.toLowerCase()
            }
          })
      }
    }
    updateSpectateCodes()
    this.spectateCodeInterval = setInterval(updateSpectateCodes, 10_000)
  }

  get matchStatusInfo(): MatchStatusInfoMessage['info'] {
    return this._statusInfo
  }

  getOpponent = (playerID: string): PlayerContext => {
    return [...this.playerContexts.values()].find(p => p?.id !== playerID)!
  }

  linkContextToMatch = (
    playerID: string,
    newContext: PlayerContext
  ): PlayerContext => {
    const oldContext = this.playerContexts.get(playerID)

    return oldContext
      ? this.updateContext(newContext, oldContext, playerID)
      : this.registerContext(newContext, playerID)
  }

  postMessage = (message: ThreadTransportMessage) => {
    try {
      this.worker.postMessage(message)
    } catch (error) {
      logger.error(`WORKER COMMUNICATION FAILED`, {
        workerID: this.worker.id,
        matchID: this.matchID,
        message
      })
    }
  }

  getSpectators(
    spectatedPlayer: string
  ): Array<{ context: PlayerContext; canSeeHand: boolean }> {
    const p = this.playerInfo.get(spectatedPlayer)!
    const pSpectators = [...this.spectators.values()].map(s => ({
      context: s.context,
      canSeeHand: s.codes.some(c => c === p.spectateCode)
    }))
    return pSpectators
  }

  private handler = (
    message:
      | ThreadTransportMessage
      | MatchStatusInfoMessage
      | MatchEndedMessage
      | MatchRecordDoneMessage
      | MatchCreatedMessage
  ) => {
    try {
      // message is meant for another match proxy
      if (message.matchID !== this.matchID) {
        return
      }
      switch (message.type) {
        case 'internal_match_created':
          logger.info('MATCH CREATED SUCCESSFULLY', { matchID: this.matchID })
          break
        case 'relay': {
          if (message.message.type === 'reconnect_spectator') {
            const s = this.spectators.get(message.message.forSpectator)
            if (s) {
              s.context.send({
                ...message.message,
                type: 'reconnect'
              })
            }
            break
          }
          if (
            message.message.type === 'error' &&
            message.message.forSpectator
          ) {
            const s = this.spectators.get(message.message.forSpectator)
            if (s) {
              s.context.send(message.message)
            }
            break
          }
          const player = this.playerContexts.get(message.playerID)
          if (!player) {
            logger.warn('CANNOT RELAY ACTION', {
              matchID: this.matchID,
              messageType: message.type
            })
            break
          }
          player.send(message.message)
          if (message.message.type === 'reconnect') {
            player.send({
              type: 'spectators_list',
              spectators: this.getSpectators(message.playerID).map(
                ({ context, canSeeHand }) => ({
                  id: 0,
                  address: context.id ?? '',
                  canSeeHand
                })
              )
            })
          } else {
            for (const s of this.spectators.values()) {
              s.context.send(message.message)
            }
          }
          break
        }
        case 'internal_match_ended':
          logger.info('MATCH ENDED', { matchID: this.matchID })
          this.isDead = true
          clearInterval(this.spectateCodeInterval)

          this.worker.removeMatch(this.matchID)
          matchbook.removeMatch(this)
          this.playerContexts.forEach(p => {
            clearTimeout(p?.abandonCountdown)
          })

          break
        case 'internal_match_recorded':
          clearInterval(this.spectateCodeInterval)
          this.playerContexts.forEach(p => {
            p?.send({
              type: 'match_ended'
            })
            p?.connection.close(WEBSOCKET_FORCED_CLOSE_CODE)
          })
          break
        case 'match_status_info':
          this._statusInfo = message.info
          break
        default:
          break
      }
    } catch (error) {
      logger.error('MATCH PROXY HANDLER ERROR', error, {
        matchID: this.matchID,
        messageType: message.type
      })
    }
  }

  getPlayerInfoById(playerID: string): PlayerInformation {
    const playerInfo = this.playerInfo.get(playerID)

    if (!playerInfo) {
      throw new Error(`Cannot find player info with id ${playerID}`)
    }

    return playerInfo
  }

  private registerContext = (
    context: PlayerContext,
    playerID: string
  ): PlayerContext => {
    context.setPlayerInfo(this.getPlayerInfoById(playerID))
    context.setMatchWorker(this)

    this.playerContexts.set(playerID, context)

    return context
  }

  private updateContext = (
    newContext: PlayerContext,
    oldContext: PlayerContext,
    playerID: string
  ): PlayerContext => {
    // clear abandon timer on old context upon reconnection
    clearTimeout(oldContext.abandonCountdown)
    // Old context needs to lose ref to match worker, so it
    // doesn't fire disconnect when it leaves
    oldContext.setMatchWorker(undefined)
    oldContext.send({
      type: 'error',
      level: 'server',
      message: 'You connected in another session, please play there.'
    })

    // migrate player old context info to new context
    newContext.setPlayerInfo(this.getPlayerInfoById(playerID))
    newContext.setMatchWorker(this)
    newContext.realDeckString = oldContext.realDeckString
    newContext.sessionID = oldContext.sessionID
    newContext.sessionStartTime = oldContext.sessionStartTime

    this.playerContexts.set(playerID, newContext)

    return newContext
  }
}
