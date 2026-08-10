import { WasmMatchBotOpponent } from '@opensky/bot'
import { GameMode } from '@opensky/proto'
import {
  EmoteMessage,
  GameplayMessage,
  JoinServerMessage,
  MuteOpponentMessage,
  ReconnectMessage,
  ReconnectSpectatorMessage,
  SpectateServerMessage
} from '@opensky/shared/game-server-message-types'
import { MatchLogBase } from '@opensky/shared/matchLog'
import { convertAddress, SubkeyProof } from '@opensky/shared/subkey'
import { CardLibrary } from '@skyweaver/state-metadata'
import {
  GameState,
  getValidActions,
  Player,
  PlayerSecret,
  SkyWeaver,
  validatePlayerAction,
  WasmMatch
} from '@skyweaver/state-node-sys'
import { randomBytes } from 'crypto'
import { ethers } from 'ethers'
import { threadId } from 'worker_threads'

import { PlayerStatus } from '../../model'
import { MatchRegistryService } from '../../services/RegistryService'
import { getInt64Bytes } from '../../utils/helpers'
import { logger } from '../../utils/logger'
import { releaseVersion } from '../../utils/releaseVersion'
import { Match } from './Match'
import { ThreadPlayerContext } from './ThreadPlayerContext'
import { MatchData, ThreadTransportMessage } from './TransportModels'
import { diffDecoder, errorMessage, post } from './utils'

export class MatchHandler extends Match {
  // match: Match
  playersConnected: Set<string>
  matchID: number
  constructor(
    public p1: ThreadPlayerContext,
    public p2: ThreadPlayerContext,
    public matchData: MatchData,
    public onMatchStart: () => void,
    public onMatchGameEnd: () => void,
    public onMatchRecordEnd: () => void,
    public matchRegistry: MatchRegistryService
  ) {
    super(
      p1,
      p2,
      getInt64Bytes(matchData.matchID),
      matchData.startTime,
      matchData.matchSettings,
      onMatchStart,
      onMatchGameEnd,
      onMatchRecordEnd,
      matchRegistry
    )

    const { matchID, replayID } = matchData

    this.matchID = matchID
    this.replayID = replayID

    logger.info('CREATING NEW MATCH', {
      matchID,
      threadId,
      player1: { id: p1.id, name: p1.account?.name },
      player2: { id: p2.id, name: p2.account?.name }
    })

    logger.debug('MATCH STORE CREATED, WAITING FOR PLAYERS TO CONNECT')

    this.playersConnected = new Set()

    // Put bots in-game instead of real players
    for (const { player, playerIndex } of [p1, p2].map(
      (player, playerIndex) => ({
        player,
        playerIndex: playerIndex as Player
      })
    )) {
      if (player.botState) {
        const subkeyWallet = player.botState.subkeyWallet
        const bot = new WasmMatchBotOpponent(
          playerIndex,
          self => {
            return [
              WasmMatch.deserialize(
                this.serialize(playerIndex + 1),
                false,
                (
                  state: GameState<SkyWeaver>,
                  secret: PlayerSecret<SkyWeaver>
                ) => {
                  setTimeout(() => {
                    self.handleStateChange(state, secret)
                  }, 1)
                },
                (messageToSign: ethers.utils.BytesLike) =>
                  Array.from(
                    ethers.utils.arrayify(
                      ethers.utils.joinSignature(
                        subkeyWallet
                          ._signingKey()
                          .signDigest(ethers.utils.hashMessage(messageToSign))
                      )
                    )
                  ),
                (binDiff: Uint8Array) => {
                  const hexDiff = ethers.utils.hexlify(binDiff)
                  setTimeout(() => {
                    const message = {
                      type: 'gameplay' as const,
                      data: [hexDiff]
                    }
                    this.messageLog({
                      type: 'relay',
                      matchID: this.matchID,
                      message,
                      playerID: player.id!
                    })
                    this.handleGameplayMessage(player.id!, message)
                  }, 1)
                },
                () => {
                  // intentionally empty
                },
                (randomByteCount: number) =>
                  Array.from(randomBytes(randomByteCount))
              ),
              getValidActions,
              validatePlayerAction,
              CardLibrary,
              () => {
                // noop :)
              }
            ]
          },
          {
            difficulty: matchData.matchSettings.botDifficulty || 0.5
          }
        )
        this.botStates[playerIndex] = bot
        const proof = new SubkeyProof(player.id!, subkeyWallet.address)

        const messageTypedData = proof.messageTypedData()

        subkeyWallet
          ._signTypedData(
            messageTypedData.domain,
            messageTypedData.types,
            messageTypedData.message
          )
          .then(certificationSignature =>
            this.handleJoin({
              authToken: '',
              loadingProgress: 1,
              subkeyCertification: {
                player: Array.from(ethers.utils.arrayify(player.id!)),
                subkey: Array.from(ethers.utils.arrayify(subkeyWallet.address)),
                signature: Array.from(
                  ethers.utils.arrayify(certificationSignature)
                )
              },
              type: 'join_server'
            })
          )
      }
    }
  }

  getPlayerContextByID = (playerID: string): ThreadPlayerContext => {
    if (playerID === this.p1.id) {
      return this.p1
    }
    if (playerID === this.p2.id) {
      return this.p2
    }

    throw new Error(`player context not found for ${playerID}`)
  }

  handleJoin = (message: JoinServerMessage) => {
    const playerID = convertAddress(message.subkeyCertification.player)

    const playerIndex = this.playerContexts.findIndex(p => p.id === playerID)
    if (playerIndex === -1) {
      logger.error(
        `${playerID} reconnected, but it's not in the list of playerContexts!`,
        {
          playerID
        }
      )
      return
    }

    const player = this.getPlayerContextByID(playerID)
    const subkey = ethers.utils.getAddress(
      ethers.utils.hexlify(message.subkeyCertification.subkey)
    )
    const playerAssociatedWithSubkey = this.store.getAddressPlayer(subkey)
    if (playerAssociatedWithSubkey === undefined) {
      try {
        const approvalMessage = WasmMatch.getApproval(playerID, subkey)
        // We've reconnected with a different subkey, add it to the state.
        this.progressStoreOutOfPendingState()
        this.dispatchApprove(
          playerID,
          subkey,
          ethers.utils.hexlify(this.serverSign(approvalMessage))
        )
        this.onActionApplied()
      } catch (err) {
        logger.error('Failed to dispatch certify for new subkey', { err })
        player.send(errorMessage(err))
      }
    }

    player.status = PlayerStatus.CONNECTED
    const serializedGame = this.serialize(playerIndex + 1)
    logger.info('Reconnecting player...', {
      storePlayer: this.store.player,
      playerIndex,
      serializeArg: playerIndex + 1,
      firstByte: serializedGame[0]
    })
    const rejoinMessage: ReconnectMessage = {
      type: 'reconnect',
      accounts: [this.p1.account, this.p2.account],
      store: ethers.utils.hexlify(serializedGame),
      turnExpiryTime: this.turnExpiryTime,
      isGameStart: !this.started,
      replayID: this.replayID,
      opponentMuted: player.opponentMuted,
      gitCommit: releaseVersion
    }

    if (
      [GameMode.CONQUEST_CONSTRUCTED, GameMode.CONQUEST_DISCOVERY].includes(
        this.p1.mode
      )
    ) {
      rejoinMessage.conquestInfo = [
        this.p1.conquestInfo!,
        this.p2.conquestInfo!
      ]
    }

    player.send(rejoinMessage)

    this.playersConnected.add(playerID)
  }

  handleSpectatorJoin = (message: SpectateServerMessage) => {
    if (!message.spectatingPlayer) {
      logger.error("spectate join failed, couldn't find spectating player", {
        spectatedPlayer: message.spectatingPlayer
      })
      return
    }
    const [spectatePlayer] = message.spectateToken.toLowerCase().split('.')

    const player = this.getPlayerContextByID(spectatePlayer)
    if (!player) {
      logger.error("spectate join failed, couldn't find player", {
        spectatePlayer
      })
      return
    }
    const validCodes = this.playerContexts
      .map((p, i) => [p, i] as const)
      .filter(
        ([p, _]) =>
          message.allowedSecrets?.includes(p.id?.toLowerCase() as string)
      )
      .map(([_, i]) => i)

    const knowledge =
      validCodes.length === 0
        ? 0
        : validCodes.length === 2
        ? 3
        : validCodes[0] + 1
    const rejoinMessage: ReconnectSpectatorMessage = {
      type: 'reconnect_spectator',
      accounts: [this.p1.account, this.p2.account],
      store: ethers.utils.hexlify(this.serialize(knowledge)),
      turnExpiryTime: this.turnExpiryTime,
      isGameStart: !this.started,
      forSpectator: message.spectatingPlayer,
      replayID: this.replayID,
      opponentMuted: false,
      gitCommit: releaseVersion
    }

    if (
      [GameMode.CONQUEST_CONSTRUCTED, GameMode.CONQUEST_DISCOVERY].includes(
        this.p1.mode
      )
    ) {
      rejoinMessage.conquestInfo = [
        this.p1.conquestInfo!,
        this.p2.conquestInfo!
      ]
    }

    player.send(rejoinMessage)
  }

  handleEmoteMessage = (playerID: string, message: EmoteMessage) => {
    const player = this.playerContexts.find(p => p.id === playerID)
    const opponent = this.playerContexts[this.getOpponentID(playerID)]

    if (
      !player ||
      !opponent ||
      !(player.finishedLoadingAssets && opponent.finishedLoadingAssets)
    ) {
      return
    }
    if (message.fromSpectator) {
      player.send(message)
    } else {
      opponent.send(message)
    }
  }

  handleEnemyMutedMessage = (
    playerID: string,
    message: MuteOpponentMessage
  ) => {
    const player = this.playerContexts.find(p => p.id === playerID)
    const opponent = this.playerContexts[this.getOpponentID(playerID)]

    if (
      !player ||
      !opponent ||
      !(player.finishedLoadingAssets && opponent.finishedLoadingAssets)
    ) {
      return
    }
    player.opponentMuted = message.muted
  }
  handleGameplayMessage = (playerID: string, message: GameplayMessage) => {
    const player = this.playerContexts.find(p => p.id === playerID)
    const opponent = this.playerContexts[this.getOpponentID(playerID)]

    if (
      !player ||
      !opponent ||
      !(player.finishedLoadingAssets && opponent.finishedLoadingAssets)
    ) {
      this.messagesPostponedUntilAssetsLoad.push([playerID, message])
      this.logger.revertAllPotential()
      return
    }
    const oldQueue = this.sendQueue

    this.sendQueue = [...message.data]

    const playerGameplayMessagesLength = this.sendQueue.length

    try {
      // apply action to server state
      this.receive(message)
    } catch (error) {
      this.logger.revertAllPotential()
      this.sendQueue = oldQueue

      if (
        typeof error === 'string' &&
        error.includes('diff.proof != self.hash')
      ) {
        // this is non fatal, means someone fired a move late & didn't apply, log as warn
        logger.warn('PROOF HASH MISMATCH', {
          error,
          matchID: this.id,
          message
        })
      } else {
        logger.error(
          'WASM GAME STATE ERROR: Failed to handle gameplay message.',
          { error },
          {
            matchID: this.id,
            message
          }
        )
      }

      player.send(errorMessage(error))

      if (error instanceof Error) {
        // kill match in conditions where RuntimeError thrown breaks the match
        if (error.stack?.includes('RuntimeError')) {
          opponent.send(errorMessage(error))

          this.logger
            .append(
              {
                type: 'error',
                timestamp: new Date(),
                error: {
                  message: error.message,
                  stack: error.stack
                }
              },
              true
            )
            .then(() => this.onMatchGameEnd())
            .then(() => this.crashed())
            .then(() => this.onMatchRecordEnd())
        }
      }

      return
    }

    if (opponent.botState) {
      const bot = this.botStates[this.playerContexts.indexOf(opponent)]!
      const sq = [...this.sendQueue]
      for (const diff of sq) {
        bot.apply(ethers.utils.arrayify(diff))
      }
    } else if (opponent.status === PlayerStatus.CONNECTED) {
      // relay action to opponent (->)
      opponent.send({
        type: 'gameplay',
        data: this.sendQueue
      })
    }

    if (this.sendQueue.length > playerGameplayMessagesLength) {
      // You don't need your own diff(s) sent back, so skip (n = original diffs count) diffs
      const diffs = this.sendQueue.slice(playerGameplayMessagesLength)

      const playerIndex = this.playerContexts.indexOf(player)
      if (this.botStates[playerIndex]) {
        const bot = this.botStates[playerIndex]!
        for (const diff of diffs) {
          bot.apply(ethers.utils.arrayify(diff))
        }
      } else {
        player.send({
          type: 'gameplay',
          data: diffs
        })
      }
    }

    this.sendQueue = []
  }

  handlePlayerFinishLoadingAssets = (playerID: string) => {
    const player = this.playerContexts.find(p => p.id === playerID)

    if (player && !player.finishedLoadingAssets) {
      player.finishedLoadingAssets = true
      if (this.matchState) {
        // We've finished loading assets for both players for the first time. safe to start the turn timer
        this.startNewTurnTimer(true)
      } else if (this.playerContexts.every(p => p.finishedLoadingAssets)) {
        // we were already in a pending state, and now both players are finished loading assets.
        // So we can start the regular commit reveal timeout.
        this.startCommitRevealTimeout()
        const delayedMessages = this.messagesPostponedUntilAssetsLoad
        this.messagesPostponedUntilAssetsLoad = []
        for (const [address, message] of delayedMessages) {
          this.messageLog({
            type: 'relay',
            matchID: this.id,
            playerID: address,
            message
          })
          this.handleGameplayMessage(address, message)
          this.logger.commitAllPotential()
        }
      }
    }

    // indicate to player their opponent has fully loaded as well, in case the opponent's loading progress completed instantly (e.g. headless bot)
    if (this.playerContexts.every(p => p.finishedLoadingAssets)) {
      player?.send({
        type: 'opponent_loading_progress',
        progress: 1,
        matchAbandonTime: -1 // because there's no abandon if each player has fully loaded assets
      })
    }
  }

  handleAbandonMessage = (playerID: string) => {
    try {
      logger.debug('ABANDONING MATCH', { matchID: this.id, playerID })
      this.tryDispatch({
        type: 'Abandon',
        player: this.playerContexts.findIndex(c => c.id === playerID) as Player
      })
    } catch (error) {
      logger.error('ABANDON MATCH ERROR', error)
    }
  }

  handlePlayerDisconnected = (playerID: string) => {
    const player = this.playerContexts.find(p => p.id === playerID)

    if (player) {
      player.status = PlayerStatus.DISCONNECTED
    }
  }

  handleCheckDisconnectMidCommitRevealMessage = (playerID: string) => {
    if (
      !this.matchState &&
      !this.isDead &&
      this.store.pendingPlayer === this.store.player
    ) {
      logger.info('DISCONNECTED DURING COMMIT REVEAL...', {
        matchID: this.id,
        playerID
      })
      this.dispatchTimeout()
    }
  }

  /* MISC */

  messageLog = ({ message, playerID }: ThreadTransportMessage) => {
    const playerName = this.getPlayerContextByID(playerID).name

    const matchLog: MatchLogBase = {
      timestamp: new Date(),
      message
    }

    const info = {
      type: message.type,
      matchID: this.matchID,
      playerID,
      playerName
    }

    if (message.type === 'gameplay') {
      const difflog = message.data
        .map((diff: any) => diffDecoder(diff))
        .filter(d => d !== null) as string[]

      logger.debug('GAMEPLAY MESSAGE', { ...info, actions: difflog })

      this.logger.append({
        type: 'gameplay',
        difflog,
        ...matchLog
      })
    } else {
      logger.info('MESSAGE', { ...info })

      this.logger.append({
        type: 'noop',
        ...matchLog
      })
    }
  }

  updateMatchStatus = () => {
    post({
      type: 'match_status_info',
      matchID: this.matchID,
      info: {
        matchID: this.matchID,
        threadID: threadId,
        mode: this.p1.mode,
        turnCount: this.matchState ? this.matchState.state.turnCount : 'N/A',
        startTime: this.matchData.startTime,
        player1: {
          id: this.p1.id!,
          name: (this.p1.account && this.p1.account.name) ?? 'unknown name',
          status: this.p1.status
        },
        player2: {
          id: this.p2.id!,
          name: (this.p2.account && this.p2.account.name) ?? 'unknown name',
          status: this.p2.status
        },
        matchLogURL: this.logger.uri || ''
      }
    })
  }
}
