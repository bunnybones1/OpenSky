import { encode, VERSION } from '@opensky/deck-string-codec'
import { DeckClass, GameMode, PlayerRank } from '@opensky/proto'
import {
  AbandonMatchMessage,
  AccountWithPrismsAndCosmeticsInfo,
  DisconnectMidCommitRevealMessage,
  EmoteMessage,
  GameplayMessage,
  GameServerMessage,
  JoinServerMessage,
  MuteOpponentMessage,
  PlayerDisconnected,
  PlayerFinishedLoadingAssets,
  SpectateServerMessage
} from '@opensky/shared/game-server-message-types'
import { PrivateSeed } from '@skyweaver/state-metadata'
import * as WebSocket from 'ws'

import { MatchProxy } from './core/MatchProxy'
import { PlayerStatus } from './model'
import { prismsToDeckClass, randomDeckStringCheck } from './utils/helpers'
import { logger } from './utils/logger'
import { PlayerInformation } from './worker/match/TransportModels'

const KEEPALIVE_INTERVAL = 5000
const KEEPALIVE_GRACE_PERIOD = 2000

export class PlayerContext {
  id: string | null = null
  status: PlayerStatus
  privateSeed?: PrivateSeed
  deckString?: string
  realDeckString?: string
  account?: AccountWithPrismsAndCosmeticsInfo
  spectatedPlayer?: string
  connection: WebSocket.WebSocket
  sessionID?: string
  mode: GameMode
  isRandomDeck: boolean
  sessionStartTime: string
  abandonCountdown?: NodeJS.Timeout
  playerSessionID: string
  loadingProgress = 0
  lastEmoteTimestamps: [number, number, number] = [0, 0, 0]

  private _matchProxy?: MatchProxy

  // ping management
  private _keepaliveInterval: NodeJS.Timeout
  private _keepaliveResponseTime: number =
    KEEPALIVE_INTERVAL + KEEPALIVE_GRACE_PERIOD
  private _lastPingTime: number

  constructor(connection: WebSocket.WebSocket) {
    this.connection = connection
    this.status = PlayerStatus.CONNECTED
    this._lastPingTime = Date.now()
  }

  authenticatedAs = (playerAddress: string) => {
    if (!this.id) {
      this.id = playerAddress
    }
  }

  setMatchWorker(match: MatchProxy | undefined) {
    this._matchProxy = match
  }

  setPlayerInfo = (playerInfo: PlayerInformation) => {
    this.privateSeed = playerInfo.privateSeed
    this.mode = playerInfo.gameMode
    this.account = playerInfo.account
    this.deckString =
      (playerInfo.privateSeed &&
        encode(
          VERSION,
          playerInfo.privateSeed.cards,
          prismsToDeckClass(playerInfo.privateSeed.prisms) ??
            DeckClass.UNKNOWN_CLASS
        )) ??
      undefined

    this.isRandomDeck =
      !!this.deckString && !!this.deckString.match(randomDeckStringCheck)
  }

  processMessage(
    message:
      | GameplayMessage
      | EmoteMessage
      | MuteOpponentMessage
      | JoinServerMessage
      | SpectateServerMessage
      | AbandonMatchMessage
      | DisconnectMidCommitRevealMessage
      | PlayerDisconnected
      | PlayerFinishedLoadingAssets
  ) {
    if (!this._matchProxy) {
      logger.error('PLAYER CONTEXT ERROR NO MATCH FOUND', { message })
      return
    }

    this._matchProxy.postMessage({
      type: 'relay',
      matchID: this._matchProxy.matchID,
      playerID: this.id!,
      message
    })
  }

  get isAuthenticated(): boolean {
    return !!this.id
  }

  get opponent(): PlayerContext | undefined {
    return this._matchProxy?.getOpponent(this.id!)
  }

  get matchProxy(): MatchProxy | undefined {
    return this._matchProxy
  }

  get rank(): PlayerRank | undefined {
    return this.mode === GameMode.RANKED_CONSTRUCTED
      ? this.account?.stats?.rankedConstructed?.playerRank
      : this.account?.stats?.rankedDiscovery?.playerRank
  }

  send(data: GameServerMessage): void {
    const conn = this.connection
    if (conn.readyState === conn.OPEN) {
      conn.send(
        JSON.stringify(data),
        (err: Error) => err && logger.error('ws send failed', err)
      )
    }
  }

  clearPingInterval() {
    clearInterval(this._keepaliveInterval)
  }

  ping(id: string): void {
    this.clearPingInterval()
    const now = Date.now()

    const last = this._lastPingTime
    this._lastPingTime = now

    const latency = now - last - KEEPALIVE_INTERVAL

    this._keepaliveResponseTime =
      KEEPALIVE_INTERVAL + KEEPALIVE_GRACE_PERIOD + latency

    this.connection.send(`PONG:${id}`)

    this._keepaliveInterval = global.setTimeout(() => {
      this.connection.terminate()

      logger.warn('CLIENT WS TIMEOUT', {
        playerID: this.id,
        name: this.account?.name,
        timeout: this._keepaliveResponseTime
      })
    }, this._keepaliveResponseTime)
  }
}
