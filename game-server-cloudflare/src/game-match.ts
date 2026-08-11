import { GameMode, MatchStatus } from '@opensky/proto'
import {
  EmoteMessage,
  GameServerMessage,
  JoinServerMessage,
  SpectateServerMessage
} from '@opensky/shared/game-server-message-types'
import { MatchmakerStartMatchMessage } from '@opensky/shared/matchmaker-message-types'
import { HeroSkinLibrary } from '@opensky/shared/cosmetics'
import { Player, PrivateSeed, Rarity } from '@skyweaver/state-metadata'

import { addressBytesToHex, bytesToHex } from './encoding'
import {
  readAbandonPenaltyConfig,
  recordAbandonPenalty
} from './abandon-penalties'
import { applyConquestPoints } from './conquest-points'
import {
  applyConquestProgress,
  applyMatchExperience,
  applyMatchProgression,
  applyMatchStats
} from './progression'
import {
  AcceptedClientMessage,
  CreateMatchRequest,
  GameProtocolError,
  INTERNAL_AUTH_HEADER,
  parseClientMessage,
  stateError,
  TRUSTED_PRINCIPAL_HEADER,
  TRUSTED_USER_ID_HEADER
} from './protocol'
import {
  AuthoritativeMatchRuntime,
  MatchQuestRuntimeState,
  normalizePrivateSeed
} from './state-runtime'

const METADATA_KEY = 'match:metadata'
const SNAPSHOT_KEY = 'match:snapshot'
const PLAYERS_KEY = 'match:players'
const TIMERS_KEY = 'match:timers'
const PENDING_GAMEPLAY_KEY = 'match:pending-gameplay'
const QUEST_RUNTIME_KEY = 'match:quest-runtime'
const QUEST_PROGRESS_KEY = 'match:quest-progress'
const REPLAY_RECORD_PREFIX = 'match:replay:'
const REPLAY_NEXT_INDEX_KEY = 'match:replay-next-index'
const MAX_REPLAY_RECORD_BYTES = 1024 * 1024

export interface GameServerEnv {
  GAME_MATCHES: DurableObjectNamespace
  AUTH_DB: D1Database
  INTERNAL_AUTH_SECRET: string
  MATCH_OWNER_PRIVATE_KEY: string
  ALLOWED_ORIGINS?: string
  PUBLIC_WS_BASE_URL: string
  TURN_EXPIRY_MS?: string
  TURN_EXTENSION_MS?: string
  COMMIT_REVEAL_EXPIRY_MS?: string
  ABANDON_TIMEOUT_MS?: string
  BOT_ACTION_DELAY_MS?: string
  ABANDON_PENALTY_WINDOW_MS?: string
  ABANDON_PENALTY_SECONDS?: string
}

interface MatchMetadata {
  proposalId: string
  // Optional only for Durable Objects created before release pinning shipped.
  releaseVersion?: string
  match: MatchmakerStartMatchMessage
  createdAtMs: number
  started: boolean
  ended: boolean
  endedAtMs?: number
  result?: MatchResult
  completionRecorded?: boolean
}

interface MatchResult {
  winner?: Player
  turnCount?: number
  moveCount?: number
  status?: MatchStatus
}

interface PlayerRuntimeState {
  connected: boolean
  joined: boolean
  loadingProgress: number
  finishedLoadingAssets: boolean
  opponentMuted: boolean
  lastEmoteTimestamps: [number, number, number]
  abandonAtMs?: number
}

type PlayerStateMap = Record<string, PlayerRuntimeState>

interface MatchTimers {
  commitRevealAtMs?: number
  turnAtMs?: number
  lastTurnCount?: number
  lastMoveCount?: number
  botAtMs?: number
  botFailureCount?: number
  botActionCount?: number
  botPlayedManaVial?: boolean
}

interface PendingGameplay {
  principal: string
  data: string[]
}

interface SocketAttachment {
  principal: string
  userId: string
  // Optional for sockets hibernated before spectator roles were introduced.
  role?: 'player' | 'spectator'
  joined: boolean
  connectedAtMs: number
  spectatedPrincipal?: string
  spectatedPlayer?: Player
  knowledge?: 0 | 1 | 2 | 3
}

interface MatchLedgerParticipants {
  player1_principal: string
  player2_principal: string
  player1_user_id: string | null
  player2_user_id: string | null
}

interface RuntimeSettings {
  turnExpiryMs: number
  turnExtensionMs: number
  commitRevealExpiryMs: number
  abandonTimeoutMs: number
  botActionDelayMs: number
}

const positiveInteger = (
  value: string | undefined,
  fallback: number,
  max: number
) => {
  const number = Number(value)
  return Number.isInteger(number) && number > 0 && number <= max
    ? number
    : fallback
}

const runtimeSettings = (env: GameServerEnv): RuntimeSettings => ({
  turnExpiryMs: positiveInteger(env.TURN_EXPIRY_MS, 60_000, 10 * 60_000),
  turnExtensionMs: positiveInteger(env.TURN_EXTENSION_MS, 5_000, 60_000),
  commitRevealExpiryMs: positiveInteger(
    env.COMMIT_REVEAL_EXPIRY_MS,
    2_000,
    60_000
  ),
  abandonTimeoutMs: positiveInteger(
    env.ABANDON_TIMEOUT_MS,
    180_000,
    30 * 60_000
  ),
  botActionDelayMs: positiveInteger(env.BOT_ACTION_DELAY_MS, 650, 10_000)
})

const normalizedAddress = (address: string) => address.toLowerCase()
const MAX_SPECTATORS = 50

const validateCreateRequest = (request: CreateMatchRequest) => {
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(request.proposalId)) {
    throw new Error('invalid proposal ID')
  }
  if (!/^[a-zA-Z0-9._-]{1,128}$/.test(request.releaseVersion)) {
    throw new Error('invalid release version')
  }
  const match = request.match
  if (
    !match ||
    match.type !== 'start_match' ||
    !Number.isSafeInteger(match.matchID) ||
    match.matchID < 0 ||
    typeof match.replayID !== 'string' ||
    !match.player1 ||
    !match.player2
  ) {
    throw new Error('invalid start_match payload')
  }
  for (const participant of [match.player1, match.player2]) {
    const principal = normalizedAddress(participant.account.address)
    if (!/^0x[0-9a-f]{40}$/.test(principal))
      throw new Error('invalid player address')
    if (addressBytesToHex(participant.privateSeed.player) !== principal) {
      throw new Error('private seed player does not match account address')
    }
    if (participant.privateSeed.randomSeed.length !== 16) {
      throw new Error('invalid player random seed')
    }
    if (
      participant.botSubkey !== false &&
      !/^(?:0x)?[0-9a-f]{64}$/i.test(participant.botSubkey)
    ) {
      throw new Error('invalid bot subkey')
    }
  }
}

const normalizeCreateRequest = (
  request: CreateMatchRequest
): CreateMatchRequest => ({
  ...request,
  match: {
    ...request.match,
    player1: {
      ...request.match.player1,
      privateSeed: normalizePrivateSeed(
        request.match.player1.privateSeed as PrivateSeed
      )
    },
    player2: {
      ...request.match.player2,
      privateSeed: normalizePrivateSeed(
        request.match.player2.privateSeed as PrivateSeed
      )
    }
  }
})

const emptyPlayerState = (isBot: boolean): PlayerRuntimeState => ({
  connected: isBot,
  joined: isBot,
  loadingProgress: isBot ? 1 : 0,
  finishedLoadingAssets: isBot,
  opponentMuted: false,
  lastEmoteTimestamps: [0, 0, 0]
})

const heroRarity = (
  participant: MatchmakerStartMatchMessage['player1']
): Rarity =>
  [...HeroSkinLibrary.values()].find(
    skin => participant.account.deckEquipment?.heroSkin === skin.id
  )?.grade ?? 'base'

export class GameMatch implements DurableObject {
  private runtime?: AuthoritativeMatchRuntime
  private readonly settings: RuntimeSettings

  constructor(
    private readonly state: DurableObjectState,
    private readonly env: GameServerEnv
  ) {
    this.settings = runtimeSettings(env)
  }

  async fetch(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url)
      if (url.pathname === '/internal/create')
        return await this.createMatch(request)
      if (url.pathname === '/internal/status') return await this.status(request)
      if (url.pathname === '/internal/replay-index')
        return await this.replayIndex(request)
      if (url.pathname.startsWith('/internal/replay/'))
        return await this.replayRecord(request, url.pathname)
      if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
        return new Response('Expected WebSocket upgrade', { status: 426 })
      }
      return await this.connectSocket(request)
    } finally {
      this.releaseRuntime()
    }
  }

  async webSocketMessage(socket: WebSocket, raw: string | ArrayBuffer) {
    try {
      const attachment =
        socket.deserializeAttachment() as SocketAttachment | null
      if (!attachment) {
        socket.close(1008, 'Missing identity')
        return
      }
      if (typeof raw === 'string' && raw.startsWith('PING:')) {
        this.safeSend(socket, `PONG:${raw.slice(5, 128)}`)
        return
      }
      try {
        const message = parseClientMessage(raw)
        const role = attachment.role ?? 'player'
        if (!attachment.joined) {
          const bootstrapAllowed =
            message.type === 'timesync' ||
            (role === 'player' &&
              (message.type === 'join_server' ||
                message.type === 'player_loading_progress')) ||
            (role === 'spectator' && message.type === 'spectate_server')
          if (!bootstrapAllowed) {
            throw new GameProtocolError(
              `${role === 'spectator' ? 'spectate_server' : 'join_server'} is required first`
            )
          }
        }
        await this.handleMessage(socket, attachment, message)
      } catch (error) {
        this.safeSend(socket, stateError(error))
        if (error instanceof GameProtocolError)
          socket.close(1008, error.message)
      }
    } finally {
      this.releaseRuntime()
    }
  }

  async webSocketClose(socket: WebSocket) {
    try {
      await this.disconnectPlayer(socket)
    } finally {
      this.releaseRuntime()
    }
  }

  async webSocketError(socket: WebSocket) {
    try {
      await this.disconnectPlayer(socket)
    } finally {
      this.releaseRuntime()
    }
  }

  async alarm() {
    try {
      const metadata = await this.metadata()
      if (!metadata) return
      if (metadata.ended) {
        if (!metadata.completionRecorded) {
          await this.recordCompletionWithRetry(
            metadata,
            Date.now(),
            await this.questProgress()
          )
        }
        return
      }
      const [players, timers] = await Promise.all([
        this.players(),
        this.timers()
      ])
      const now = Date.now()
      const runtime = await this.ensureRuntime()

      const expiredPlayer = Object.entries(players).find(
        ([, player]) =>
          player.abandonAtMs !== undefined && player.abandonAtMs <= now
      )
      let emitted: string[] = []
      if (expiredPlayer) {
        const index = this.playerIndex(metadata.match, expiredPlayer[0])
        emitted = runtime.dispatchAbandon(index)
        expiredPlayer[1].abandonAtMs = undefined
      } else if (
        timers.commitRevealAtMs !== undefined &&
        timers.commitRevealAtMs <= now
      ) {
        emitted = runtime.dispatchTimeout()
        timers.commitRevealAtMs = undefined
      } else if (timers.turnAtMs !== undefined && timers.turnAtMs <= now) {
        emitted = runtime.dispatchTurnTimeout()
        timers.turnAtMs = undefined
      } else if (timers.botAtMs !== undefined && timers.botAtMs <= now) {
        timers.botAtMs = undefined
        await this.runBotAction(metadata, timers, runtime)
      }
      if (emitted.length > 0) {
        this.broadcast({ type: 'gameplay', data: emitted })
        await this.replayGameplay(emitted)
      }
      await this.afterStateChange(metadata, players, timers, now)
    } finally {
      this.releaseRuntime()
    }
  }

  private async createMatch(request: Request) {
    if (!this.isInternal(request))
      return new Response('Not found', { status: 404 })
    const existing = await this.metadata()
    const input = normalizeCreateRequest(
      (await request.json()) as CreateMatchRequest
    )
    validateCreateRequest(input)
    if (existing) {
      if (
        existing.proposalId !== input.proposalId ||
        existing.releaseVersion !== input.releaseVersion ||
        existing.match.matchID !== input.match.matchID ||
        JSON.stringify(existing.match) !== JSON.stringify(input.match)
      ) {
        return Response.json(
          { error: 'match object already initialized' },
          { status: 409 }
        )
      }
      return this.creationResponse(existing)
    }

    const metadata: MatchMetadata = {
      proposalId: input.proposalId,
      releaseVersion: input.releaseVersion,
      match: input.match,
      createdAtMs: Date.now(),
      started: false,
      ended: false
    }
    const runtime = AuthoritativeMatchRuntime.create({
      matchId: input.match.matchID,
      season: input.match.matchSettings.season,
      player1Seed: input.match.player1.privateSeed as PrivateSeed,
      player2Seed: input.match.player2.privateSeed as PrivateSeed,
      heroRarities: [
        heroRarity(input.match.player1),
        heroRarity(input.match.player2)
      ],
      ownerPrivateKey: this.env.MATCH_OWNER_PRIVATE_KEY,
      participants: [input.match.player1, input.match.player2]
    })
    this.runtime = runtime
    const replay = runtime.initialReplayState()
    const replayInit = this.replayJson([
      {
        type: 'init',
        version: input.releaseVersion,
        players: [input.match.player1, input.match.player2].map(
          participant => ({
            id: participant.account.address,
            name: participant.account.name || 'unknown_name',
            initDeckString: '',
            stats: participant.account.stats,
            heroSkinID: participant.account.deckEquipment?.heroSkin,
            cardBackID: participant.account.deckEquipment?.cardBack
          })
        ),
        rootProof: replay.rootProof,
        secrets: replay.secrets,
        gameMode:
          input.match.player1.gameMode === input.match.player2.gameMode
            ? input.match.player1.gameMode
            : GameMode.UNKNOWN,
        timestamp: new Date().toISOString()
      }
    ])
    const players: PlayerStateMap = {
      [normalizedAddress(input.match.player1.account.address)]:
        emptyPlayerState(Boolean(input.match.player1.botSubkey)),
      [normalizedAddress(input.match.player2.account.address)]:
        emptyPlayerState(Boolean(input.match.player2.botSubkey))
    }
    await this.state.storage.put({
      [METADATA_KEY]: metadata,
      [SNAPSHOT_KEY]: runtime.snapshot(),
      [PLAYERS_KEY]: players,
      [TIMERS_KEY]: {} satisfies MatchTimers,
      [PENDING_GAMEPLAY_KEY]: [] satisfies PendingGameplay[],
      [QUEST_RUNTIME_KEY]: runtime.questRuntimeState(),
      [QUEST_PROGRESS_KEY]: runtime.questProgress(),
      [REPLAY_NEXT_INDEX_KEY]: 1,
      [`${REPLAY_RECORD_PREFIX}000000`]: replayInit
    })
    await this.afterStateChange(metadata, players, {}, Date.now())
    return this.creationResponse(metadata)
  }

  private async status(request: Request) {
    if (!this.isInternal(request))
      return new Response('Not found', { status: 404 })
    const metadata = await this.metadata()
    if (!metadata) return Response.json({ initialized: false }, { status: 404 })
    const [players, timers] = await Promise.all([this.players(), this.timers()])
    const runtime = await this.ensureRuntime()
    const stateInfo = runtime.stateInfo()
    return Response.json({
      initialized: true,
      proposalId: metadata.proposalId,
      releaseVersion: metadata.releaseVersion,
      matchId: metadata.match.matchID,
      started: metadata.started,
      ended: metadata.ended,
      players,
      timers,
      state: stateInfo,
      questProgress: runtime.questProgress(),
      sockets: this.state.getWebSockets().length
    })
  }

  private async replayIndex(request: Request) {
    if (!this.isInternal(request))
      return new Response('Not found', { status: 404 })
    const records = await this.state.storage.list<string>({
      prefix: REPLAY_RECORD_PREFIX
    })
    return Response.json({
      indexes: [...records.keys()]
        .map(key => Number(key.slice(REPLAY_RECORD_PREFIX.length)))
        .filter(Number.isSafeInteger)
        .sort((left, right) => left - right)
    })
  }

  private async replayRecord(request: Request, pathname: string) {
    if (!this.isInternal(request))
      return new Response('Not found', { status: 404 })
    const value = pathname.slice('/internal/replay/'.length)
    if (!/^\d{1,6}$/.test(value))
      return new Response('Invalid replay index', { status: 400 })
    const record = await this.state.storage.get<string>(
      this.replayRecordKey(Number(value))
    )
    if (!record) return new Response('Replay record not found', { status: 404 })
    return new Response(record, {
      headers: {
        'content-type': 'application/json',
        'cache-control': 'private, max-age=3600',
        'x-content-type-options': 'nosniff'
      }
    })
  }

  private async connectSocket(request: Request) {
    const principal = normalizedAddress(
      request.headers.get(TRUSTED_PRINCIPAL_HEADER) ?? ''
    )
    const userId = request.headers.get(TRUSTED_USER_ID_HEADER) ?? ''
    const metadata = await this.metadata()
    if (!metadata) return new Response('Match not found', { status: 404 })
    if (
      !this.isInternal(request) ||
      !/^0x[0-9a-f]{40}$/.test(principal) ||
      !userId
    ) {
      return new Response('Not authorized for match', { status: 401 })
    }
    const role = this.playerAddresses(metadata.match).includes(principal)
      ? 'player'
      : 'spectator'
    const previousSockets = this.state.getWebSockets(principal)
    if (
      role === 'spectator' &&
      previousSockets.length === 0 &&
      this.spectatorSockets(undefined, true).length >= MAX_SPECTATORS
    ) {
      return new Response('Too many spectators', { status: 429 })
    }
    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)
    const attachment: SocketAttachment = {
      principal,
      userId: userId.slice(0, 256),
      role,
      joined: false,
      connectedAtMs: Date.now()
    }
    server.serializeAttachment(attachment)
    this.state.acceptWebSocket(server, [principal])
    for (const previous of previousSockets) {
      this.safeSend(previous, {
        type: 'error',
        level: 'user',
        message: 'connected in another location'
      })
      previous.close(4001, 'Duplicate connection')
    }
    return new Response(null, { status: 101, webSocket: client })
  }

  private async handleMessage(
    socket: WebSocket,
    attachment: SocketAttachment,
    message: AcceptedClientMessage
  ) {
    const role = attachment.role ?? 'player'
    switch (message.type) {
      case 'join_server': {
        if (role !== 'player')
          throw new GameProtocolError('spectator cannot join as a player')
        await this.join(socket, attachment, message)
        return
      }
      case 'spectate_server': {
        if (role !== 'spectator')
          throw new GameProtocolError('players cannot spectate their own match')
        if (attachment.joined)
          throw new GameProtocolError('spectator is already joined')
        await this.spectate(socket, attachment, message)
        return
      }
      case 'timesync':
        this.safeSend(socket, {
          type: 'timesync',
          serverTime: Date.now(),
          clientTime: message.clientTime
        })
        return
      case 'player_loading_progress':
        this.requirePlayer(role)
        await this.updateLoading(attachment.principal, message.progress)
        return
      case 'gameplay':
        this.requirePlayer(role)
        await this.gameplay(attachment.principal, message.data)
        return
      case 'emote':
        await this.emote(attachment, message)
        return
      case 'mute_opponent': {
        this.requirePlayer(role)
        const players = await this.players()
        players[attachment.principal].opponentMuted = message.muted
        await this.state.storage.put(PLAYERS_KEY, players)
        return
      }
      case 'abandon_match':
        this.requirePlayer(role)
        await this.abandon(attachment.principal)
        return
      case 'error':
        console.error(
          'game client reported error',
          attachment.principal,
          message.message
        )
        return
    }
  }

  private async join(
    socket: WebSocket,
    attachment: SocketAttachment,
    message: JoinServerMessage
  ) {
    const metadata = await this.metadataRequired()
    const runtime = await this.ensureRuntime()
    const subkey = addressBytesToHex(message.subkeyCertification.subkey)
    const participant =
      this.playerIndex(metadata.match, attachment.principal) === 0
        ? metadata.match.player1
        : metadata.match.player2
    const rootSubkey = addressBytesToHex(participant.privateSeed.subkey)
    const emitted =
      rootSubkey === subkey
        ? []
        : runtime.approveSubkey(attachment.principal, subkey)
    if (emitted.length > 0) {
      this.broadcast({ type: 'gameplay', data: emitted })
      await this.replayGameplay(emitted)
    }

    attachment.joined = true
    socket.serializeAttachment(attachment)
    const players = await this.players()
    const player = players[attachment.principal]
    player.connected = true
    player.joined = true
    player.loadingProgress = Math.max(
      player.loadingProgress,
      message.loadingProgress
    )
    player.finishedLoadingAssets = player.loadingProgress >= 1
    player.abandonAtMs = undefined
    await this.state.storage.put({
      [PLAYERS_KEY]: players,
      [SNAPSHOT_KEY]: runtime.snapshot()
    })

    const index = this.playerIndex(metadata.match, attachment.principal)
    const timers = await this.timers()
    const reconnect: GameServerMessage = {
      type: 'reconnect',
      accounts: [
        metadata.match.player1.account,
        metadata.match.player2.account
      ],
      store: bytesToHex(runtime.serialize((index + 1) as 1 | 2)),
      turnExpiryTime: timers.turnAtMs ?? 0,
      isGameStart: !metadata.started,
      replayID: metadata.match.replayID,
      opponentMuted: player.opponentMuted,
      gitCommit: metadata.releaseVersion || 'cloud-weasel'
    }
    if (
      metadata.match.player1.gameMode === GameMode.CONQUEST_CONSTRUCTED ||
      metadata.match.player1.gameMode === GameMode.CONQUEST_DISCOVERY
    ) {
      reconnect.conquestInfo = [
        metadata.match.player1.conquestInfo!,
        metadata.match.player2.conquestInfo!
      ]
    }
    this.safeSend(socket, reconnect)
    this.sendToOpponent(metadata.match, attachment.principal, {
      type: 'opponent_connected'
    })
    this.sendToSpectators({ type: 'opponent_connected' })
    if (this.spectatorSockets(attachment.principal).length > 0) {
      this.updateSpectators(attachment.principal)
    }
    await this.updateLoading(attachment.principal, player.loadingProgress)
  }

  private async spectate(
    socket: WebSocket,
    attachment: SocketAttachment,
    message: SpectateServerMessage
  ) {
    const metadata = await this.metadataRequired()
    const ledger = await this.env.AUTH_DB.prepare(
      `SELECT player1_principal, player2_principal,
              player1_user_id, player2_user_id
       FROM multiplayer_matches
       WHERE proposal_id = ? AND status IN ('active', 'ended')`
    )
      .bind(metadata.proposalId)
      .first<MatchLedgerParticipants>()
    if (!ledger) throw new GameProtocolError('match cannot be found')

    const [requestedTarget, ...requestedCodes] = message.spectateToken
      .toLowerCase()
      .split('.')
    const principalTargets = [
      normalizedAddress(ledger.player1_principal),
      normalizedAddress(ledger.player2_principal)
    ]
    const identityTargets = [
      ledger.player1_user_id,
      ledger.player2_user_id
    ].map(userId => (userId ? `identity:${userId.toLowerCase()}` : undefined))
    const targetIndex = [0, 1].find(
      index =>
        requestedTarget === principalTargets[index] ||
        requestedTarget === identityTargets[index]
    )
    if (targetIndex === undefined) {
      throw new GameProtocolError('spectated player is not in match')
    }
    const targetUserId =
      targetIndex === 0 ? ledger.player1_user_id : ledger.player2_user_id
    if (
      attachment.principal === principalTargets[targetIndex] ||
      (targetUserId !== null &&
        attachment.userId.toLowerCase() === targetUserId.toLowerCase())
    ) {
      throw new GameProtocolError('you cannot spectate yourself')
    }

    const codes = new Set(requestedCodes)
    const settings = await this.env.AUTH_DB.prepare(
      `SELECT user_id, spectate_code
       FROM player_account_settings
       WHERE user_id IN (?, ?)`
    )
      .bind(ledger.player1_user_id, ledger.player2_user_id)
      .all<{ user_id: string; spectate_code: string | null }>()
    let knowledge = 0
    for (const setting of settings.results) {
      if (
        !setting.spectate_code ||
        !codes.has(setting.spectate_code.toLowerCase())
      )
        continue
      if (setting.user_id === ledger.player1_user_id) knowledge |= 1
      if (setting.user_id === ledger.player2_user_id) knowledge |= 2
    }

    attachment.joined = true
    attachment.spectatedPrincipal = principalTargets[targetIndex]
    attachment.spectatedPlayer = targetIndex as Player
    attachment.knowledge = knowledge as 0 | 1 | 2 | 3
    socket.serializeAttachment(attachment)

    const runtime = await this.ensureRuntime()
    const timers = await this.timers()
    const reconnect: GameServerMessage = {
      type: 'reconnect',
      accounts: [
        metadata.match.player1.account,
        metadata.match.player2.account
      ],
      store: bytesToHex(runtime.serialize(attachment.knowledge)),
      turnExpiryTime: timers.turnAtMs ?? 0,
      isGameStart: !metadata.started,
      replayID: metadata.match.replayID,
      opponentMuted: false,
      gitCommit: metadata.releaseVersion || 'cloud-weasel'
    }
    if (
      metadata.match.player1.gameMode === GameMode.CONQUEST_CONSTRUCTED ||
      metadata.match.player1.gameMode === GameMode.CONQUEST_DISCOVERY
    ) {
      reconnect.conquestInfo = [
        metadata.match.player1.conquestInfo!,
        metadata.match.player2.conquestInfo!
      ]
    }
    this.safeSend(socket, reconnect)
    this.updateSpectators(attachment.spectatedPrincipal)
  }

  private async updateLoading(principal: string, progress: number) {
    const metadata = await this.metadataRequired()
    const players = await this.players()
    const player = players[principal]
    player.loadingProgress = progress
    player.finishedLoadingAssets = progress >= 1
    const opponentPrincipal = this.opponentAddress(metadata.match, principal)
    const matchAbandonTime =
      metadata.createdAtMs + this.settings.abandonTimeoutMs
    const loadingForOpponent = {
      type: 'opponent_loading_progress',
      progress,
      matchAbandonTime
    } as const
    this.sendToPrincipal(opponentPrincipal, loadingForOpponent)
    this.sendToSpectators(loadingForOpponent)
    const opponent = players[opponentPrincipal]
    const loadingForPlayer = {
      type: 'opponent_loading_progress',
      progress: opponent.loadingProgress,
      matchAbandonTime
    } as const
    this.sendToPrincipal(principal, loadingForPlayer)
    this.sendToSpectators(loadingForPlayer)
    await this.state.storage.put(PLAYERS_KEY, players)
    if (
      Object.values(players).every(current => current.finishedLoadingAssets)
    ) {
      const loadingComplete = {
        type: 'opponent_loading_progress',
        progress: 1,
        matchAbandonTime: -1
      } as const
      this.sendToPrincipal(principal, loadingComplete)
      this.sendToSpectators(loadingComplete)
      await this.flushPendingGameplay(metadata, players)
    }
    await this.afterStateChange(
      metadata,
      players,
      await this.timers(),
      Date.now(),
      true
    )
  }

  private async gameplay(principal: string, diffs: string[]) {
    const metadata = await this.metadataRequired()
    if (metadata.ended) {
      this.sendToPrincipal(principal, { type: 'match_ended' })
      return
    }
    const players = await this.players()
    if (!Object.values(players).every(player => player.finishedLoadingAssets)) {
      const pending = await this.pendingGameplay()
      const totalDiffs = pending.reduce(
        (sum, item) => sum + item.data.length,
        0
      )
      if (totalDiffs + diffs.length > 64)
        throw new Error('too many postponed diffs')
      pending.push({ principal, data: diffs })
      await this.state.storage.put(PENDING_GAMEPLAY_KEY, pending)
      return
    }
    await this.applyGameplay(metadata, players, principal, diffs)
  }

  private async applyGameplay(
    metadata: MatchMetadata,
    players: PlayerStateMap,
    principal: string,
    diffs: string[]
  ) {
    const runtime = await this.ensureRuntime()
    const result = runtime.applyClientDiffs(diffs)
    const opponent = this.opponentAddress(metadata.match, principal)
    this.sendToPrincipal(opponent, {
      type: 'gameplay',
      data: result.opponentDiffs
    })
    this.sendToSpectators({
      type: 'gameplay',
      data: result.opponentDiffs
    })
    await this.replayGameplay(result.opponentDiffs)
    if (result.senderDiffs.length > 0) {
      this.sendToPrincipal(principal, {
        type: 'gameplay',
        data: result.senderDiffs
      })
      this.sendToSpectators({
        type: 'gameplay',
        data: result.senderDiffs
      })
    }
    await this.afterStateChange(
      metadata,
      players,
      await this.timers(),
      Date.now()
    )
  }

  private async flushPendingGameplay(
    metadata: MatchMetadata,
    players: PlayerStateMap
  ) {
    const pending = await this.pendingGameplay()
    await this.state.storage.put(
      PENDING_GAMEPLAY_KEY,
      [] satisfies PendingGameplay[]
    )
    for (const message of pending) {
      await this.applyGameplay(
        metadata,
        players,
        message.principal,
        message.data
      )
    }
  }

  private async emote(attachment: SocketAttachment, message: EmoteMessage) {
    const metadata = await this.metadataRequired()
    const players = await this.players()
    if (!Object.values(players).every(player => player.finishedLoadingAssets))
      return
    if ((attachment.role ?? 'player') === 'spectator') {
      if (!('sticker' in message) || !attachment.spectatedPrincipal) return
      const owned = await this.env.AUTH_DB.prepare(
        `SELECT 1 FROM player_items
         WHERE user_id = ? AND item_type = 'SW_STICKERS'
           AND token_id = ? AND balance > 0`
      )
        .bind(attachment.userId, message.sticker)
        .first()
      if (!owned) throw new GameProtocolError('spectator used unowned sticker')
      const sanitized: EmoteMessage = {
        type: 'emote',
        sticker: message.sticker,
        fromSpectator: `identity:${attachment.userId}`
      }
      this.sendToPrincipal(attachment.spectatedPrincipal, sanitized)
      this.sendToSpectators(sanitized, attachment.spectatedPrincipal)
      await this.replayEmote(sanitized)
      return
    }
    const principal = attachment.principal
    const player = players[principal]
    const now = Date.now()
    const sinceFirst = now - player.lastEmoteTimestamps[0]
    const sinceLast = now - player.lastEmoteTimestamps[2]
    if (sinceLast <= 4_000 || sinceFirst <= 40_000) return
    player.lastEmoteTimestamps = [
      player.lastEmoteTimestamps[1],
      player.lastEmoteTimestamps[2],
      now
    ]
    const sanitized = { ...message } as EmoteMessage
    delete sanitized.fromPlayer
    delete sanitized.fromSpectator
    sanitized.fromPlayer = this.playerIndex(metadata.match, principal)
    this.sendToPrincipal(
      this.opponentAddress(metadata.match, principal),
      sanitized
    )
    this.sendToSpectators(sanitized)
    await this.replayEmote(sanitized)
    await this.state.storage.put(PLAYERS_KEY, players)
  }

  private async abandon(principal: string) {
    const metadata = await this.metadataRequired()
    if (metadata.ended) return
    const players = await this.players()
    const runtime = await this.ensureRuntime()
    const emitted = runtime.dispatchAbandon(
      this.playerIndex(metadata.match, principal)
    )
    if (emitted.length > 0) {
      this.broadcast({ type: 'gameplay', data: emitted })
      await this.replayGameplay(emitted)
    }
    await this.afterStateChange(
      metadata,
      players,
      await this.timers(),
      Date.now()
    )
  }

  private async afterStateChange(
    metadata: MatchMetadata,
    players: PlayerStateMap,
    timers: MatchTimers,
    now: number,
    newlyLoaded = false
  ) {
    const runtime = await this.ensureRuntime()
    const info = runtime.stateInfo()
    if (info.statusType === 'GameOver') {
      metadata.ended = true
      metadata.endedAtMs ??= now
      metadata.result ??= {
        winner: info.winner,
        turnCount: info.turnCount,
        moveCount: info.moveCount,
        status:
          info.lastActionType === 'Abandon'
            ? MatchStatus.ABANDONED
            : info.lastActionType === 'Concede'
              ? MatchStatus.FORFEITED
              : MatchStatus.COMPLETED
      }
      timers.commitRevealAtMs = undefined
      timers.turnAtMs = undefined
      timers.botAtMs = undefined
      this.broadcast({ type: 'match_ended' })
    } else if (!info.hasState) {
      metadata.started = false
      timers.turnAtMs = undefined
      timers.botAtMs = undefined
      timers.commitRevealAtMs =
        now +
        (Object.values(players).every(player => player.finishedLoadingAssets)
          ? this.settings.commitRevealExpiryMs
          : this.settings.abandonTimeoutMs + 10_000)
    } else {
      metadata.started = true
      timers.commitRevealAtMs = undefined
      const stateAdvanced =
        info.turnCount !== timers.lastTurnCount ||
        info.moveCount !== timers.lastMoveCount
      if (stateAdvanced) timers.botFailureCount = 0
      if (metadata.match.matchSettings.turnTimer) {
        if (
          newlyLoaded ||
          timers.turnAtMs === undefined ||
          info.turnCount !== timers.lastTurnCount
        ) {
          timers.turnAtMs = now + this.settings.turnExpiryMs
        } else if (info.moveCount !== timers.lastMoveCount) {
          timers.turnAtMs = Math.min(
            now + this.settings.turnExpiryMs,
            timers.turnAtMs + this.settings.turnExtensionMs
          )
        }
        if (timers.turnAtMs !== undefined && info.currentPlayer !== undefined) {
          this.broadcast({
            type: 'turntimer',
            turnExpiryTime: timers.turnAtMs,
            player: info.currentPlayer
          })
        }
      }
      timers.lastTurnCount = info.turnCount
      timers.lastMoveCount = info.moveCount
      const bot = this.botParticipant(metadata.match)
      const botShouldAct =
        bot !== undefined &&
        (info.playersDoneCardSelection?.[bot.index] === false ||
          info.currentPlayer === bot.index)
      if (botShouldAct && (timers.botFailureCount ?? 0) < 3) {
        timers.botAtMs ??= now + this.settings.botActionDelayMs
      } else {
        timers.botAtMs = undefined
      }
    }
    await this.state.storage.put({
      [METADATA_KEY]: metadata,
      [PLAYERS_KEY]: players,
      [TIMERS_KEY]: timers,
      [SNAPSHOT_KEY]: runtime.snapshot(),
      [QUEST_RUNTIME_KEY]: runtime.questRuntimeState(),
      [QUEST_PROGRESS_KEY]: runtime.questProgress()
    })
    await this.scheduleAlarm(players, timers, now)
    if (metadata.ended && !metadata.completionRecorded) {
      await this.recordCompletionWithRetry(
        metadata,
        now,
        runtime.questProgress()
      )
    }
  }

  private async recordCompletionWithRetry(
    metadata: MatchMetadata,
    now: number,
    questProgress: [Record<number, number>, Record<number, number>]
  ) {
    try {
      const endedAt = new Date(metadata.endedAtMs ?? now).toISOString()
      const progression = await applyMatchProgression(
        this.env.AUTH_DB,
        metadata.proposalId,
        questProgress,
        endedAt
      )
      const conquestPoints = await applyConquestPoints(
        this.env.AUTH_DB,
        metadata.proposalId,
        metadata.result?.winner,
        metadata.result?.status ?? MatchStatus.COMPLETED,
        metadata.result?.turnCount ?? 0,
        endedAt
      )
      await applyConquestProgress(
        this.env.AUTH_DB,
        metadata.proposalId,
        metadata.result?.winner,
        endedAt
      )
      const stats = await applyMatchStats(
        this.env.AUTH_DB,
        metadata.proposalId,
        metadata.match.matchSettings.season,
        metadata.result?.winner,
        endedAt
      )
      const experience = await applyMatchExperience(
        this.env.AUTH_DB,
        metadata.proposalId,
        metadata.match.matchSettings.season,
        [metadata.match.player1.gameMode, metadata.match.player2.gameMode],
        metadata.result?.winner,
        metadata.result?.status ?? MatchStatus.COMPLETED,
        metadata.result?.turnCount ?? 0,
        endedAt,
        stats.rewards
      )
      if (
        metadata.result?.status === MatchStatus.ABANDONED &&
        (metadata.result.winner === 0 || metadata.result.winner === 1)
      ) {
        const loser = metadata.result.winner === 0 ? 1 : 0
        const principals = this.playerAddresses(metadata.match)
        await recordAbandonPenalty(
          this.env.AUTH_DB,
          {
            proposalId: metadata.proposalId,
            principal: principals[loser],
            releaseVersion: metadata.releaseVersion ?? 'cloud-weasel',
            mode:
              loser === 0
                ? metadata.match.player1.gameMode
                : metadata.match.player2.gameMode
          },
          readAbandonPenaltyConfig(this.env),
          now
        )
      }
      const result = await this.env.AUTH_DB.prepare(
        `UPDATE multiplayer_matches
         SET status = 'ended', winner_player = ?, result_json = ?,
             ended_at = ?, updated_at = ?
         WHERE proposal_id = ? AND status IN ('active', 'ended')`
      )
        .bind(
          metadata.result?.winner ?? null,
          JSON.stringify({
            ...(metadata.result ?? {}),
            questProgress: progression.questProgress,
            rewards: [
              [
                ...conquestPoints.rewards[0],
                ...stats.rewards[0],
                ...experience.rewards[0]
              ],
              [
                ...conquestPoints.rewards[1],
                ...stats.rewards[1],
                ...experience.rewards[1]
              ]
            ]
          }),
          endedAt,
          endedAt,
          metadata.proposalId
        )
        .run()
      if ((result.meta.changes ?? 0) < 1) {
        throw new Error('active match ledger row was not found')
      }
      const principals = this.playerAddresses(metadata.match)
      for (const player of [0, 1] as const) {
        this.sendToPrincipal(principals[player], {
          type: 'rewards',
          data: [
            ...progression.rewards[player],
            ...conquestPoints.rewards[player],
            ...stats.rewards[player],
            ...experience.rewards[player]
          ] as never[]
        })
      }
      metadata.completionRecorded = true
      await this.state.storage.put(METADATA_KEY, metadata)
    } catch (error) {
      console.error(
        'match completion recording failed',
        metadata.proposalId,
        error
      )
      await this.state.storage.setAlarm(now + 10_000)
    }
  }

  private async scheduleAlarm(
    players: PlayerStateMap,
    timers: MatchTimers,
    now: number
  ) {
    const candidates = [
      timers.commitRevealAtMs,
      timers.turnAtMs,
      timers.botAtMs,
      ...Object.values(players).map(player => player.abandonAtMs)
    ]
      .filter((value): value is number => value !== undefined && value > now)
      .sort((left, right) => left - right)
    if (candidates[0] !== undefined)
      await this.state.storage.setAlarm(candidates[0])
    else await this.state.storage.deleteAlarm()
  }

  private async runBotAction(
    metadata: MatchMetadata,
    timers: MatchTimers,
    runtime: AuthoritativeMatchRuntime
  ) {
    const bot = this.botParticipant(metadata.match)
    if (!bot || metadata.ended) return
    const result = await runtime.createBotAction(
      bot.index,
      bot.participant.botSubkey as string,
      metadata.match.matchSettings.botDifficulty ?? 0.5,
      {
        actionCount: timers.botActionCount ?? 0,
        playedManaVial: timers.botPlayedManaVial ?? false
      }
    )
    timers.botActionCount = result.policy.actionCount
    timers.botPlayedManaVial = result.policy.playedManaVial
    if (result.diffs.length === 0) {
      timers.botFailureCount = (timers.botFailureCount ?? 0) + 1
      console.error('bot did not produce an action', {
        matchId: metadata.match.matchID,
        player: bot.index,
        failures: timers.botFailureCount
      })
      return
    }
    const applied = runtime.applyClientDiffs(result.diffs)
    timers.botFailureCount = 0
    this.sendToOpponent(metadata.match, bot.participant.account.address, {
      type: 'gameplay',
      data: applied.opponentDiffs
    })
    this.sendToSpectators({
      type: 'gameplay',
      data: applied.opponentDiffs
    })
    await this.replayGameplay(applied.opponentDiffs)
  }

  private botParticipant(match: MatchmakerStartMatchMessage) {
    const participants = [match.player1, match.player2] as const
    const index = participants.findIndex(
      participant => typeof participant.botSubkey === 'string'
    )
    return index < 0
      ? undefined
      : {
          index: index as Player,
          participant: participants[index]
        }
  }

  private async disconnectPlayer(socket: WebSocket) {
    const attachment = socket.deserializeAttachment() as SocketAttachment | null
    if (!attachment?.joined) return
    if ((attachment.role ?? 'player') === 'spectator') {
      const spectatedPrincipal = attachment.spectatedPrincipal
      attachment.joined = false
      socket.serializeAttachment(attachment)
      if (spectatedPrincipal) this.updateSpectators(spectatedPrincipal)
      return
    }
    if (
      this.state
        .getWebSockets(attachment.principal)
        .some(other => other.readyState === WebSocket.OPEN)
    ) {
      return
    }
    const metadata = await this.metadata()
    if (!metadata || metadata.ended) return
    const players = await this.players()
    const player = players[attachment.principal]
    player.connected = false
    player.abandonAtMs = Date.now() + this.settings.abandonTimeoutMs
    this.sendToOpponent(metadata.match, attachment.principal, {
      type: 'opponent_disconnected'
    })
    this.sendToSpectators({ type: 'opponent_disconnected' })
    const runtime = await this.ensureRuntime()
    const info = runtime.stateInfo()
    // Source behavior only advances immediately when the authoritative owner,
    // represented by `store.player === undefined`, owes the reveal.
    if (!info.hasState && info.pendingPlayer === undefined) {
      const emitted = runtime.dispatchTimeout()
      if (emitted.length > 0) {
        this.broadcast({ type: 'gameplay', data: emitted })
        await this.replayGameplay(emitted)
      }
    }
    await this.afterStateChange(
      metadata,
      players,
      await this.timers(),
      Date.now()
    )
  }

  private replayRecordKey(index: number) {
    return `${REPLAY_RECORD_PREFIX}${String(index).padStart(6, '0')}`
  }

  private replayJson(value: unknown) {
    const body = JSON.stringify(value, (_key, current) =>
      current instanceof Uint8Array ? bytesToHex(current) : current
    )
    if (new TextEncoder().encode(body).byteLength > MAX_REPLAY_RECORD_BYTES) {
      throw new Error('replay record is too large')
    }
    return body
  }

  private async appendReplay(value: unknown) {
    try {
      const index =
        (await this.state.storage.get<number>(REPLAY_NEXT_INDEX_KEY)) ?? 1
      await this.state.storage.put({
        [this.replayRecordKey(index)]: this.replayJson(value),
        [REPLAY_NEXT_INDEX_KEY]: index + 1
      })
    } catch (error) {
      // Source matches continue if record archival is unavailable.
      console.error('replay record append failed', error)
    }
  }

  private replayGameplay(diffs: string[]) {
    if (diffs.length === 0) return Promise.resolve()
    return this.appendReplay([
      {
        type: 'gameplay',
        timestamp: new Date().toISOString(),
        message: { type: 'gameplay', data: diffs }
      }
    ])
  }

  private replayEmote(message: EmoteMessage) {
    return this.appendReplay([
      {
        type: 'noop',
        timestamp: new Date().toISOString(),
        message
      }
    ])
  }

  private async ensureRuntime() {
    if (this.runtime) return this.runtime
    const [snapshot, metadata, questRuntimeState] = await Promise.all([
      this.state.storage.get<Uint8Array>(SNAPSHOT_KEY),
      this.metadata(),
      this.state.storage.get<MatchQuestRuntimeState>(QUEST_RUNTIME_KEY)
    ])
    if (!snapshot || !metadata)
      throw new Error('match runtime is not initialized')
    this.runtime = AuthoritativeMatchRuntime.restore(
      snapshot,
      this.env.MATCH_OWNER_PRIVATE_KEY,
      [metadata.match.player1, metadata.match.player2],
      questRuntimeState
    )
    return this.runtime
  }

  private releaseRuntime() {
    const runtime = this.runtime
    this.runtime = undefined
    try {
      runtime?.free()
    } catch (error) {
      console.error('failed to release authoritative WASM match', error)
    }
  }

  private metadata() {
    return this.state.storage.get<MatchMetadata>(METADATA_KEY)
  }

  private async metadataRequired() {
    const metadata = await this.metadata()
    if (!metadata) throw new Error('match is not initialized')
    return metadata
  }

  private async players() {
    return (await this.state.storage.get<PlayerStateMap>(PLAYERS_KEY)) ?? {}
  }

  private async timers() {
    return (await this.state.storage.get<MatchTimers>(TIMERS_KEY)) ?? {}
  }

  private async pendingGameplay() {
    return (
      (await this.state.storage.get<PendingGameplay[]>(PENDING_GAMEPLAY_KEY)) ??
      []
    )
  }

  private async questProgress() {
    return (
      (await this.state.storage.get<
        [Record<number, number>, Record<number, number>]
      >(QUEST_PROGRESS_KEY)) ?? [{}, {}]
    )
  }

  private playerAddresses(match: MatchmakerStartMatchMessage) {
    return [
      normalizedAddress(match.player1.account.address),
      normalizedAddress(match.player2.account.address)
    ]
  }

  private playerIndex(match: MatchmakerStartMatchMessage, principal: string) {
    const index = this.playerAddresses(match).indexOf(
      normalizedAddress(principal)
    )
    if (index < 0) throw new Error('player is not in match')
    return index as Player
  }

  private opponentAddress(
    match: MatchmakerStartMatchMessage,
    principal: string
  ) {
    return this.playerAddresses(match)[1 - this.playerIndex(match, principal)]
  }

  private sendToOpponent(
    match: MatchmakerStartMatchMessage,
    principal: string,
    message: GameServerMessage
  ) {
    this.sendToPrincipal(this.opponentAddress(match, principal), message)
  }

  private sendToPrincipal(principal: string, message: GameServerMessage) {
    for (const socket of this.state.getWebSockets(principal)) {
      const attachment =
        socket.deserializeAttachment() as SocketAttachment | null
      if (attachment?.joined) this.safeSend(socket, message)
    }
  }

  private spectatorSockets(
    spectatedPrincipal?: string,
    includePending = false
  ) {
    return this.state.getWebSockets().filter(socket => {
      const attachment =
        socket.deserializeAttachment() as SocketAttachment | null
      return (
        attachment?.role === 'spectator' &&
        (includePending || attachment.joined) &&
        (!spectatedPrincipal ||
          attachment.spectatedPrincipal === spectatedPrincipal)
      )
    })
  }

  private sendToSpectators(
    message: GameServerMessage,
    spectatedPrincipal?: string
  ) {
    for (const socket of this.spectatorSockets(spectatedPrincipal)) {
      this.safeSend(socket, message)
    }
  }

  private updateSpectators(spectatedPrincipal: string) {
    const spectators = this.spectatorSockets(spectatedPrincipal)
    const message: GameServerMessage = {
      type: 'spectators_list',
      spectators: spectators.map(socket => {
        const attachment = socket.deserializeAttachment() as SocketAttachment
        const player = attachment.spectatedPlayer ?? 0
        return {
          id: 0,
          address: `identity:${attachment.userId}`,
          canSeeHand: Boolean((attachment.knowledge ?? 0) & (1 << player))
        }
      })
    }
    this.sendToPrincipal(spectatedPrincipal, message)
    for (const socket of spectators) this.safeSend(socket, message)
  }

  private requirePlayer(role: 'player' | 'spectator') {
    if (role !== 'player')
      throw new GameProtocolError('spectator cannot send player actions')
  }

  private broadcast(message: GameServerMessage) {
    for (const socket of this.state.getWebSockets()) {
      const attachment =
        socket.deserializeAttachment() as SocketAttachment | null
      if (attachment?.joined) this.safeSend(socket, message)
    }
  }

  private safeSend(socket: WebSocket, message: object | string) {
    try {
      socket.send(
        typeof message === 'string' ? message : JSON.stringify(message)
      )
    } catch {
      // Close/error handlers own cleanup.
    }
  }

  private isInternal(request: Request) {
    return (
      this.env.INTERNAL_AUTH_SECRET.length >= 16 &&
      request.headers.get(INTERNAL_AUTH_HEADER) ===
        this.env.INTERNAL_AUTH_SECRET
    )
  }

  private creationResponse(metadata: MatchMetadata) {
    return Response.json({
      proposalId: metadata.proposalId,
      matchId: metadata.match.matchID,
      serverAddress: `${this.env.PUBLIC_WS_BASE_URL}/${encodeURIComponent(metadata.proposalId)}`
    })
  }
}
