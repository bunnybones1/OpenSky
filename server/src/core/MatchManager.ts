import {
  EmoteMessage,
  ErrorMessage,
  GameplayMessage,
  GameServerMessage,
  JoinServerMessage,
  LoadingProgressMessage,
  MuteOpponentMessage,
  SpectateServerMessage,
  TimeSyncMessage
} from '@opensky/shared/game-server-message-types'
import { Player } from '@skyweaver/state-node-sys'
import * as ethers from 'ethers'
import { JwtPayload, verify as verifyJwt } from 'jsonwebtoken'

import { PlayerStatus } from '../model'
import { PlayerContext } from '../PlayerContext'
import { matchbook } from '../Server'
import { GameServerRegistryService } from '../services/RegistryService'
import { Config, getConfig } from '../utils/config'
import { logger } from '../utils/logger'
import { releaseVersion } from '../utils/releaseVersion'

export class MatchManager {
  registry: GameServerRegistryService
  config: Config

  private authProvider: ethers.providers.JsonRpcProvider
  private authNetworkId: number

  constructor(_registry: GameServerRegistryService) {
    const config = getConfig()
    if (!config) {
      throw new Error('No global config!')
    }
    this.config = config
    this.registry = _registry

    this.authProvider = new ethers.providers.JsonRpcProvider(
      this.config.ethereum.authChainUrl
    )

    this.authProvider.getNetwork().then(network => {
      this.authNetworkId = network.chainId
    })
  }

  handleMessage = (msg: GameServerMessage, context: PlayerContext) => {
    // player should already be matched with a game via matchmaker
    try {
      switch (msg.type) {
        case 'join_server':
          this.handleJoinServer(msg, context)
          break
        case 'spectate_server':
          this.handleSpectate(msg, context)
          break
        case 'gameplay':
          this.handleGameplayAction(msg, context)
          break
        case 'timesync':
          this.handleTimeSync(msg, context)
          break
        case 'player_loading_progress':
          this.handleLoadingProgress(msg, context)
          break
        case 'error':
          this.handleClientError(msg, context)
          break
        case 'emote':
          this.handlePlayerEmoted(msg, context)
          break
        case 'mute_opponent':
          this.handlePlayerMuted(msg, context)
          break
        default:
          logger.error('GAMESERVER: UNKNOWN MESSAGE', { msg })
          context.connection.close()
      }
    } catch (error) {
      logger.critical('UNEXPECTED ERROR', error, msg)
    }
  }

  disconnect = (context: PlayerContext, code: number) => {
    context.status = PlayerStatus.DISCONNECTED

    if (context.matchProxy && !context.matchProxy.isDead) {
      context.processMessage({
        type: 'player_disconnected'
      })
    }

    logger.info('PLAYER DISCONNECTED', {
      player: context.id,
      matchID: context.matchProxy?.matchID,
      accountName: context.account?.name,
      code
    })

    try {
      // Check if disconnected while in-game, if so, trigger abandon timer
      if (
        !!context.matchProxy &&
        !context.matchProxy.isDead &&
        context.id &&
        context.matchProxy.playerContexts.get(context.id) === context
      ) {
        logger.info('PLAYER DISCONNECTED MID MATCH', {
          player: context.id,
          matchID: context.matchProxy?.matchID,
          accountName: context.account?.name,
          code
        })
        const countdown = global.setTimeout(() => {
          if (context.matchProxy && !context.matchProxy.isDead) {
            logger.info('PLAYER ABANDONED MATCH', {
              player: context.id,
              matchID: context.matchProxy?.matchID,
              accountName: context.account?.name
            })

            context.processMessage({
              type: 'abandon_match'
            })
          } else {
            logger.error(
              'Abandon fired for player, but player has no match in progress!',
              { playerID: context.id }
            )
          }
        }, this.config.settings.abandonTimeout)

        this.registry.setPlayerDisconnectedAbandonStatus(
          context.id,
          this.config.settings.abandonTimeout / 1000
        )

        // clear previous countdown just in case if it still exists for some reason ...
        if (context.abandonCountdown) {
          clearTimeout(context.abandonCountdown)
        }

        // link timer to player's context
        context.abandonCountdown = countdown

        // check in thread if disconnected during a commit reveal phase
        // if so, dispatch commit reveal timeout on store ..
        context.processMessage({
          type: 'check_disconnected_mid_commit_reveal'
        })
      }
    } catch (error) {
      logger.error('DISCONNECT ERROR', error, {
        player: context.id,
        matchID: context.matchProxy?.matchID,
        accountName: context.account?.name,
        code
      })
    }

    // indicate disconnection to opponent as well
    context.opponent?.send({
      type: 'opponent_disconnected'
    })
  }

  private authenticate(authToken: string): string | null {
    try {
      const { account } = verifyJwt(
        authToken,
        this.config.services.openskyAPI.userAuthentication.jwtSecret
      ) as JwtPayload

      return ethers.utils.getAddress(account).toLowerCase()
    } catch (error) {
      logger.error('WS AUTHENTICATION ERROR', error)
      return null
    }
  }

  private handleJoinServer = async (
    message: JoinServerMessage,
    context: PlayerContext
  ) => {
    const playerID = this.authenticate(message.authToken)

    if (!playerID) {
      this.sendError(context, 'invalid authentication')
      return
    }

    // identify player based on JWT authentication
    context.authenticatedAs(playerID)

    const match = matchbook.getMatchByPlayerID(playerID)

    if (!match) {
      const registeredOrRecentMatch = await this.registry.getMatchInfo(playerID)
      if (registeredOrRecentMatch && 'rewards' in registeredOrRecentMatch) {
        const { accounts, store, conquestInfo, rewards, replayID } =
          registeredOrRecentMatch
        logger.warn('PLAYER CONNECTED TO RECENTLY ENDED MATCH', { playerID })
        context.send({
          type: 'reconnect',
          accounts: accounts,
          isGameStart: false,
          store: store,
          turnExpiryTime: Number.MAX_SAFE_INTEGER,
          conquestInfo: conquestInfo,
          replayID: replayID,
          opponentMuted: false,
          gitCommit: releaseVersion
        })
        if (rewards) {
          context.send({
            type: 'rewards',
            data: rewards
          })
        }
      } else {
        const message =
          registeredOrRecentMatch &&
          'initialized' in registeredOrRecentMatch &&
          !registeredOrRecentMatch.initialized
            ? 'match initializing, please try again later'
            : 'match ended or cannot be found.'

        logger.warn(message, { playerID })

        this.sendError(context, message)
      }
      return
    }

    // TODO: validate private seed signature off chain (lazy octopus)
    // TODO: avoid on chain queries during signature validation

    match.linkContextToMatch(playerID, context).processMessage(message)

    logger.info('PLAYER CONNECTED TO MATCH', {
      playerID: context.id,
      matchID: match.matchID,
      playerName: context.account?.name,
      type: message.type
    })

    context.opponent?.send({
      type: 'opponent_connected'
    })

    this.handleLoadingProgress(
      {
        type: 'player_loading_progress',
        progress: message.loadingProgress
      },
      context
    )
  }

  private handleSpectate = async (
    message: SpectateServerMessage,
    context: PlayerContext
  ) => {
    const spectatorPlayerID =
      (message.authToken ? this.authenticate(message.authToken) : null) ??
      `anonymous-${Math.round(Math.random() * 1000000000)}`
    const [spectatedPlayer, ...spectateCodes] = message.spectateToken
      .toLowerCase()
      .split('.')
    if (!spectatedPlayer) {
      this.sendError(context, 'invalid spectate player')
      return
    }
    if (spectatedPlayer.toLowerCase() === spectatorPlayerID.toLowerCase()) {
      this.sendError(context, 'you can\t spectate yourself')
      return
    }
    if (
      spectateCodes.length > 2 ||
      spectateCodes.some(code => code.length > 50)
    ) {
      this.sendError(context, 'invalid spectate code')
      return
    }

    // identify player based on JWT authentication
    context.authenticatedAs(spectatorPlayerID)

    const match = matchbook.getMatchByPlayerID(spectatedPlayer)

    if (!match) {
      const registeredOrRecentMatch =
        await this.registry.getMatchInfo(spectatedPlayer)
      if (registeredOrRecentMatch && 'rewards' in registeredOrRecentMatch) {
        const { accounts, store, conquestInfo, rewards, replayID } =
          registeredOrRecentMatch
        logger.warn('PLAYER CONNECTED TO RECENTLY ENDED MATCH', {
          playerID: spectatorPlayerID
        })
        context.send({
          type: 'reconnect',
          accounts: accounts,
          isGameStart: false,
          store: store,
          turnExpiryTime: Number.MAX_SAFE_INTEGER,
          conquestInfo: conquestInfo,
          replayID: replayID,
          opponentMuted: false,
          gitCommit: releaseVersion
        })
        if (rewards) {
          context.send({
            type: 'rewards',
            data: rewards
          })
        }
      } else {
        const message =
          registeredOrRecentMatch &&
          'initialized' in registeredOrRecentMatch &&
          !registeredOrRecentMatch.initialized
            ? 'match initializing, please try again later'
            : 'match ended or cannot be found.'

        logger.warn(message, { playerID: spectatorPlayerID })

        this.sendError(context, message)
      }
      return
    }

    // TODO: validate private seed signature off chain (lazy octopus)
    // TODO: avoid on chain queries during signature validation

    const existing = match.spectators.get(spectatorPlayerID)
    if (existing) {
      existing.context.send({
        type: 'error',
        level: 'user',
        message: 'connected in another location'
      })
      existing.context.connection.close()
    }

    const MAX_SPECTATORS = 50
    if (!existing && match.spectators.size >= MAX_SPECTATORS) {
      context.send({
        type: 'error',
        level: 'user',
        message: 'too many spectators'
      })
      context.connection.close()
      return
    }

    context.setMatchWorker(match)
    context.spectatedPlayer = spectatedPlayer
    if (!context.id?.includes('anonymous')) {
      Promise.all([
        match.threadService.apiClient.client.getAccount(
          {
            address: context.id!
          },
          match.threadService.apiClient.authHeaders
        ),
        match.threadService.apiClient.client.getStickerOwnership(
          {
            accountAddress: context.id!
          },
          match.threadService.apiClient.authHeaders
        )
      ]).then(([account, stickers]) => {
        const ownedStickers = Object.keys(stickers.res.stickerBalances).map(n =>
          Number.parseInt(n, 10)
        )
        context.account = {
          ...account.account,
          prisms: [],
          deckEquipment: {
            stickers: ownedStickers
          }
        }
      })
    }
    const updateSpectators = () => {
      const pSpectators = match.getSpectators(spectatedPlayer)
      const listMessage = {
        type: 'spectators_list',
        spectators: pSpectators.map(({ context, canSeeHand }) => ({
          id: 0,
          address: context.id ?? '',
          canSeeHand
        }))
      } as const
      match.playerContexts.get(spectatedPlayer)?.send(listMessage)
      for (const spectator of pSpectators) {
        spectator.context.send(listMessage)
      }
    }

    context.connection.addEventListener('close', () => {
      if (match.spectators.get(spectatorPlayerID)?.context === context) {
        match.spectators.delete(spectatorPlayerID)
      }
      updateSpectators()
    })

    match.spectators.set(spectatorPlayerID, { context, codes: spectateCodes })

    updateSpectators()

    /// Always overwrite allowedSecrets.
    const allowedSecrets = match.playerOrder
      .map(p => [p, match.playerInfo.get(p)!] as const)
      .filter(([_, p]) => spectateCodes.includes(p.spectateCode as string))
      .map(([p]) => p)
    match.playerContexts.get(spectatedPlayer)!.processMessage({
      ...message,
      spectatingPlayer: spectatorPlayerID,
      allowedSecrets
    })

    logger.info('SPECTATOR CONNECTED TO MATCH', {
      playerID: context.id,
      matchID: match.matchID,
      playerName: context.account?.name,
      type: message.type,
      spectateCodes,
      allowedSecrets,
      numSpectators: match.spectators.size
    })
  }

  private handleLoadingProgress = (
    msg: LoadingProgressMessage,
    context: PlayerContext
  ) => {
    if (!context.matchProxy) {
      return
    }
    context.loadingProgress = msg.progress
    const matchAbandonTime =
      Date.parse(context.matchProxy.matchStatusInfo.startTime) +
      this.config.settings.abandonTimeout
    const opponentAddress = [...context.matchProxy.playerInfo.keys()].find(
      p => p !== context.id
    )
    if (!opponentAddress) {
      throw new Error('Failed to find opponent.')
    }
    const opponentIsBot =
      !!context.matchProxy.getPlayerInfoById(opponentAddress).botSubkey
    // relay context's loading progress to opponent's client
    context.opponent?.send({
      type: 'opponent_loading_progress',
      progress: msg.progress,
      matchAbandonTime
    })

    // If one player joins, tell them the oppt's progress.
    context.send({
      type: 'opponent_loading_progress',
      progress: opponentIsBot ? 1 : context.opponent?.loadingProgress || 0,
      matchAbandonTime
    })

    if (msg.progress >= 1) {
      this.registry.clearPlayerLoadingAssetsAbandonStatus(context.id!)
      context.processMessage({
        type: 'player_finished_loading_assets'
      })
    }
  }

  private handleClientError = (msg: ErrorMessage, context: PlayerContext) => {
    logger.error('ERROR FROM CLIENT', {
      playerID: context.id,
      errorMessage: msg.message
    })
  }

  private handleGameplayAction = (
    msg: GameplayMessage,
    context: PlayerContext
  ) => {
    if (!context.matchProxy) {
      logger.error('Player sent a gameplay message with no game in progress.', {
        id: context.id
      })

      context.send({
        type: 'error',
        level: 'user',
        message: 'You have no game in progress!'
      })

      context.connection.close()

      this.disconnect(context, 0)
    }

    // process gameplay message in worker
    context.processMessage(msg)
  }

  private handleTimeSync = (msg: TimeSyncMessage, context: PlayerContext) => {
    context.send({
      type: 'timesync',
      serverTime: Date.now(),
      clientTime: msg.clientTime
    })
  }

  private sendError = (player: PlayerContext, message: string) => {
    logger.error(message, { playerID: player.id })

    player.send({
      type: 'error',
      message,
      level: 'server'
    })

    player.connection.close()
  }

  private handlePlayerEmoted(
    message: EmoteMessage,
    sendingContext: PlayerContext
  ) {
    delete message.fromPlayer
    delete message.fromSpectator
    const sendingGamePlayer = sendingContext.matchProxy?.playerOrder.findIndex(
      p => p.toLowerCase() === sendingContext.account?.address?.toLowerCase()
    )
    let recvPlayer = sendingContext
    if (sendingGamePlayer !== undefined && sendingGamePlayer !== -1) {
      message.fromPlayer = sendingGamePlayer as Player
    } else {
      if (!sendingContext.id || !('sticker' in message)) {
        return
      }
      message.fromSpectator = sendingContext.id
      const spectated = sendingContext.matchProxy?.playerContexts?.get(
        sendingContext.spectatedPlayer || ''
      )
      if (!spectated) {
        return
      }
      recvPlayer = spectated
    }
    if ('chat' in message) {
      if (this.config.settings.chat) {
        sendingContext.processMessage(message)
      }
      return
    }
    if ('sticker' in message) {
      if (
        !sendingContext.account?.deckEquipment?.stickers?.includes(
          message.sticker
        )
      ) {
        sendingContext.send({
          type: 'error',
          level: 'server',
          message: 'player used unowned sticker'
        })
        sendingContext.connection.close()
        return
      }
    }
    const MIN_EMOTE_DELAY = 4000
    const MIN_EMOTE_SPAM_DELAY = 40000

    const now = Date.now()
    const timeSinceFirstSavedEmote = now - sendingContext.lastEmoteTimestamps[0]
    const timeSinceLastEmote =
      now -
      sendingContext.lastEmoteTimestamps[
        sendingContext.lastEmoteTimestamps.length - 1
      ]

    if (
      timeSinceLastEmote > MIN_EMOTE_DELAY &&
      timeSinceFirstSavedEmote > MIN_EMOTE_SPAM_DELAY
    ) {
      sendingContext.lastEmoteTimestamps = [
        sendingContext.lastEmoteTimestamps[1],
        sendingContext.lastEmoteTimestamps[2],
        now
      ]
      recvPlayer.processMessage(message)
    }
  }

  private handlePlayerMuted(
    message: MuteOpponentMessage,
    sendingContext: PlayerContext
  ) {
    const sendingGamePlayer = sendingContext.matchProxy?.playerOrder.findIndex(
      p => p.toLowerCase() === sendingContext.account?.address?.toLowerCase()
    )
    // let recvPlayer = sendingContext
    if (sendingGamePlayer !== undefined && sendingGamePlayer !== -1) {
      sendingContext.processMessage(message)
    }
  }
}
