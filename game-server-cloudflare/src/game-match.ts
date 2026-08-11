import { GameMode } from '@opensky/proto'
import {
  EmoteMessage,
  GameServerMessage,
  JoinServerMessage
} from '@opensky/shared/game-server-message-types'
import { MatchmakerStartMatchMessage } from '@opensky/shared/matchmaker-message-types'
import { HeroSkinLibrary } from '@opensky/shared/cosmetics'
import { Player, PrivateSeed, Rarity } from '@skyweaver/state-metadata'

import { addressBytesToHex, bytesToHex } from './encoding'
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
import { AuthoritativeMatchRuntime, normalizePrivateSeed } from './state-runtime'

const METADATA_KEY = 'match:metadata'
const SNAPSHOT_KEY = 'match:snapshot'
const PLAYERS_KEY = 'match:players'
const TIMERS_KEY = 'match:timers'
const PENDING_GAMEPLAY_KEY = 'match:pending-gameplay'

export interface GameServerEnv {
  GAME_MATCHES: DurableObjectNamespace
  INTERNAL_AUTH_SECRET: string
  MATCH_OWNER_PRIVATE_KEY: string
  ALLOWED_ORIGINS?: string
  PUBLIC_WS_BASE_URL: string
  RELEASE_VERSION?: string
  TURN_EXPIRY_MS?: string
  TURN_EXTENSION_MS?: string
  COMMIT_REVEAL_EXPIRY_MS?: string
  ABANDON_TIMEOUT_MS?: string
}

interface MatchMetadata {
  proposalId: string
  match: MatchmakerStartMatchMessage
  createdAtMs: number
  started: boolean
  ended: boolean
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
}

interface PendingGameplay {
  principal: string
  data: string[]
}

interface SocketAttachment {
  principal: string
  userId: string
  joined: boolean
  connectedAtMs: number
}

interface RuntimeSettings {
  turnExpiryMs: number
  turnExtensionMs: number
  commitRevealExpiryMs: number
  abandonTimeoutMs: number
}

const positiveInteger = (value: string | undefined, fallback: number, max: number) => {
  const number = Number(value)
  return Number.isInteger(number) && number > 0 && number <= max ? number : fallback
}

const runtimeSettings = (env: GameServerEnv): RuntimeSettings => ({
  turnExpiryMs: positiveInteger(env.TURN_EXPIRY_MS, 60_000, 10 * 60_000),
  turnExtensionMs: positiveInteger(env.TURN_EXTENSION_MS, 5_000, 60_000),
  commitRevealExpiryMs: positiveInteger(env.COMMIT_REVEAL_EXPIRY_MS, 2_000, 60_000),
  abandonTimeoutMs: positiveInteger(env.ABANDON_TIMEOUT_MS, 180_000, 30 * 60_000)
})

const normalizedAddress = (address: string) => address.toLowerCase()

const validateCreateRequest = (request: CreateMatchRequest) => {
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(request.proposalId)) {
    throw new Error('invalid proposal ID')
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
    if (!/^0x[0-9a-f]{40}$/.test(principal)) throw new Error('invalid player address')
    if (addressBytesToHex(participant.privateSeed.player) !== principal) {
      throw new Error('private seed player does not match account address')
    }
    if (participant.privateSeed.randomSeed.length !== 16) {
      throw new Error('invalid player random seed')
    }
  }
}

const normalizeCreateRequest = (request: CreateMatchRequest): CreateMatchRequest => ({
  ...request,
  match: {
    ...request.match,
    player1: {
      ...request.match.player1,
      privateSeed: normalizePrivateSeed(request.match.player1.privateSeed as PrivateSeed)
    },
    player2: {
      ...request.match.player2,
      privateSeed: normalizePrivateSeed(request.match.player2.privateSeed as PrivateSeed)
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
    (skin) => participant.account.deckEquipment?.heroSkin === skin.id
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
      if (url.pathname === '/internal/create') return await this.createMatch(request)
      if (url.pathname === '/internal/status') return await this.status(request)
      if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
        return new Response('Expected WebSocket upgrade', { status: 426 })
      }
      return await this.connectPlayer(request)
    } finally {
      this.releaseRuntime()
    }
  }

  async webSocketMessage(socket: WebSocket, raw: string | ArrayBuffer) {
    try {
      const attachment = socket.deserializeAttachment() as SocketAttachment | null
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
        if (message.type !== 'join_server' && !attachment.joined) {
          throw new GameProtocolError('join_server is required first')
        }
        await this.handleMessage(socket, attachment, message)
      } catch (error) {
        this.safeSend(socket, stateError(error))
        if (error instanceof GameProtocolError) socket.close(1008, error.message)
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
      if (!metadata || metadata.ended) return
      const [players, timers] = await Promise.all([this.players(), this.timers()])
      const now = Date.now()
      const runtime = await this.ensureRuntime()

      const expiredPlayer = Object.entries(players).find(
        ([, player]) => player.abandonAtMs !== undefined && player.abandonAtMs <= now
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
      }
      if (emitted.length > 0) this.broadcast({ type: 'gameplay', data: emitted })
      await this.afterStateChange(metadata, players, timers, now)
    } finally {
      this.releaseRuntime()
    }
  }

  private async createMatch(request: Request) {
    if (!this.isInternal(request)) return new Response('Not found', { status: 404 })
    const existing = await this.metadata()
    const input = normalizeCreateRequest((await request.json()) as CreateMatchRequest)
    validateCreateRequest(input)
    if (existing) {
      if (
        existing.proposalId !== input.proposalId ||
        existing.match.matchID !== input.match.matchID
      ) {
        return Response.json({ error: 'match object already initialized' }, { status: 409 })
      }
      return this.creationResponse(existing)
    }

    const metadata: MatchMetadata = {
      proposalId: input.proposalId,
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
      ownerPrivateKey: this.env.MATCH_OWNER_PRIVATE_KEY
    })
    this.runtime = runtime
    const players: PlayerStateMap = {
      [normalizedAddress(input.match.player1.account.address)]: emptyPlayerState(
        Boolean(input.match.player1.botSubkey)
      ),
      [normalizedAddress(input.match.player2.account.address)]: emptyPlayerState(
        Boolean(input.match.player2.botSubkey)
      )
    }
    await this.state.storage.put({
      [METADATA_KEY]: metadata,
      [SNAPSHOT_KEY]: runtime.snapshot(),
      [PLAYERS_KEY]: players,
      [TIMERS_KEY]: {} satisfies MatchTimers,
      [PENDING_GAMEPLAY_KEY]: [] satisfies PendingGameplay[]
    })
    await this.afterStateChange(metadata, players, {}, Date.now())
    return this.creationResponse(metadata)
  }

  private async status(request: Request) {
    if (!this.isInternal(request)) return new Response('Not found', { status: 404 })
    const metadata = await this.metadata()
    if (!metadata) return Response.json({ initialized: false }, { status: 404 })
    const [players, timers] = await Promise.all([this.players(), this.timers()])
    const stateInfo = (await this.ensureRuntime()).stateInfo()
    return Response.json({
      initialized: true,
      proposalId: metadata.proposalId,
      matchId: metadata.match.matchID,
      started: metadata.started,
      ended: metadata.ended,
      players,
      timers,
      state: stateInfo,
      sockets: this.state.getWebSockets().length
    })
  }

  private async connectPlayer(request: Request) {
    const principal = normalizedAddress(request.headers.get(TRUSTED_PRINCIPAL_HEADER) ?? '')
    const userId = request.headers.get(TRUSTED_USER_ID_HEADER) ?? ''
    const metadata = await this.metadata()
    if (!metadata) return new Response('Match not found', { status: 404 })
    if (!this.isInternal(request) || !this.playerAddresses(metadata.match).includes(principal)) {
      return new Response('Not authorized for match', { status: 401 })
    }
    const previousSockets = this.state.getWebSockets(principal)
    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)
    const attachment: SocketAttachment = {
      principal,
      userId: userId.slice(0, 256),
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
    switch (message.type) {
      case 'join_server':
        await this.join(socket, attachment, message)
        return
      case 'timesync':
        this.safeSend(socket, {
          type: 'timesync',
          serverTime: Date.now(),
          clientTime: message.clientTime
        })
        return
      case 'player_loading_progress':
        await this.updateLoading(attachment.principal, message.progress)
        return
      case 'gameplay':
        await this.gameplay(attachment.principal, message.data)
        return
      case 'emote':
        await this.emote(attachment.principal, message)
        return
      case 'mute_opponent': {
        const players = await this.players()
        players[attachment.principal].opponentMuted = message.muted
        await this.state.storage.put(PLAYERS_KEY, players)
        return
      }
      case 'abandon_match':
        await this.abandon(attachment.principal)
        return
      case 'error':
        console.error('game client reported error', attachment.principal, message.message)
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
    if (emitted.length > 0) this.broadcast({ type: 'gameplay', data: emitted })

    attachment.joined = true
    socket.serializeAttachment(attachment)
    const players = await this.players()
    const player = players[attachment.principal]
    player.connected = true
    player.joined = true
    player.loadingProgress = Math.max(player.loadingProgress, message.loadingProgress)
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
      accounts: [metadata.match.player1.account, metadata.match.player2.account],
      store: bytesToHex(runtime.serialize((index + 1) as 1 | 2)),
      turnExpiryTime: timers.turnAtMs ?? 0,
      isGameStart: !metadata.started,
      replayID: metadata.match.replayID,
      opponentMuted: player.opponentMuted,
      gitCommit: this.env.RELEASE_VERSION ?? 'cloud-weasel'
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
    this.sendToOpponent(metadata.match, attachment.principal, { type: 'opponent_connected' })
    await this.updateLoading(attachment.principal, player.loadingProgress)
  }

  private async updateLoading(principal: string, progress: number) {
    const metadata = await this.metadataRequired()
    const players = await this.players()
    const player = players[principal]
    player.loadingProgress = progress
    player.finishedLoadingAssets = progress >= 1
    const opponentPrincipal = this.opponentAddress(metadata.match, principal)
    const matchAbandonTime = metadata.createdAtMs + this.settings.abandonTimeoutMs
    this.sendToPrincipal(opponentPrincipal, {
      type: 'opponent_loading_progress',
      progress,
      matchAbandonTime
    })
    const opponent = players[opponentPrincipal]
    this.sendToPrincipal(principal, {
      type: 'opponent_loading_progress',
      progress: opponent.loadingProgress,
      matchAbandonTime
    })
    await this.state.storage.put(PLAYERS_KEY, players)
    if (Object.values(players).every((current) => current.finishedLoadingAssets)) {
      this.sendToPrincipal(principal, {
        type: 'opponent_loading_progress',
        progress: 1,
        matchAbandonTime: -1
      })
      await this.flushPendingGameplay(metadata, players)
    }
    await this.afterStateChange(metadata, players, await this.timers(), Date.now(), true)
  }

  private async gameplay(principal: string, diffs: string[]) {
    const metadata = await this.metadataRequired()
    if (metadata.ended) {
      this.sendToPrincipal(principal, { type: 'match_ended' })
      return
    }
    const players = await this.players()
    if (!Object.values(players).every((player) => player.finishedLoadingAssets)) {
      const pending = await this.pendingGameplay()
      const totalDiffs = pending.reduce((sum, item) => sum + item.data.length, 0)
      if (totalDiffs + diffs.length > 64) throw new Error('too many postponed diffs')
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
    this.sendToPrincipal(opponent, { type: 'gameplay', data: result.opponentDiffs })
    if (result.senderDiffs.length > 0) {
      this.sendToPrincipal(principal, { type: 'gameplay', data: result.senderDiffs })
    }
    await this.afterStateChange(metadata, players, await this.timers(), Date.now())
  }

  private async flushPendingGameplay(metadata: MatchMetadata, players: PlayerStateMap) {
    const pending = await this.pendingGameplay()
    await this.state.storage.put(PENDING_GAMEPLAY_KEY, [] satisfies PendingGameplay[])
    for (const message of pending) {
      await this.applyGameplay(metadata, players, message.principal, message.data)
    }
  }

  private async emote(principal: string, message: EmoteMessage) {
    const metadata = await this.metadataRequired()
    const players = await this.players()
    if (!Object.values(players).every((player) => player.finishedLoadingAssets)) return
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
    this.sendToPrincipal(this.opponentAddress(metadata.match, principal), sanitized)
    await this.state.storage.put(PLAYERS_KEY, players)
  }

  private async abandon(principal: string) {
    const metadata = await this.metadataRequired()
    if (metadata.ended) return
    const players = await this.players()
    const runtime = await this.ensureRuntime()
    const emitted = runtime.dispatchAbandon(this.playerIndex(metadata.match, principal))
    if (emitted.length > 0) this.broadcast({ type: 'gameplay', data: emitted })
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
      timers.commitRevealAtMs = undefined
      timers.turnAtMs = undefined
      this.broadcast({ type: 'match_ended' })
    } else if (!info.hasState) {
      metadata.started = false
      timers.turnAtMs = undefined
      timers.commitRevealAtMs =
        now +
        (Object.values(players).every((player) => player.finishedLoadingAssets)
          ? this.settings.commitRevealExpiryMs
          : this.settings.abandonTimeoutMs + 10_000)
    } else {
      metadata.started = true
      timers.commitRevealAtMs = undefined
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
    }
    await this.state.storage.put({
      [METADATA_KEY]: metadata,
      [PLAYERS_KEY]: players,
      [TIMERS_KEY]: timers,
      [SNAPSHOT_KEY]: runtime.snapshot()
    })
    await this.scheduleAlarm(players, timers, now)
  }

  private async scheduleAlarm(players: PlayerStateMap, timers: MatchTimers, now: number) {
    const candidates = [
      timers.commitRevealAtMs,
      timers.turnAtMs,
      ...Object.values(players).map((player) => player.abandonAtMs)
    ]
      .filter((value): value is number => value !== undefined && value > now)
      .sort((left, right) => left - right)
    if (candidates[0] !== undefined) await this.state.storage.setAlarm(candidates[0])
    else await this.state.storage.deleteAlarm()
  }

  private async disconnectPlayer(socket: WebSocket) {
    const attachment = socket.deserializeAttachment() as SocketAttachment | null
    if (!attachment?.joined) return
    if (
      this.state
        .getWebSockets(attachment.principal)
        .some((other) => other.readyState === WebSocket.OPEN)
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
    const runtime = await this.ensureRuntime()
    const info = runtime.stateInfo()
    // Source behavior only advances immediately when the authoritative owner,
    // represented by `store.player === undefined`, owes the reveal.
    if (!info.hasState && info.pendingPlayer === undefined) {
      const emitted = runtime.dispatchTimeout()
      if (emitted.length > 0) this.broadcast({ type: 'gameplay', data: emitted })
    }
    await this.afterStateChange(metadata, players, await this.timers(), Date.now())
  }

  private async ensureRuntime() {
    if (this.runtime) return this.runtime
    const snapshot = await this.state.storage.get<Uint8Array>(SNAPSHOT_KEY)
    if (!snapshot) throw new Error('match runtime is not initialized')
    this.runtime = AuthoritativeMatchRuntime.restore(
      snapshot,
      this.env.MATCH_OWNER_PRIVATE_KEY
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
      (await this.state.storage.get<PendingGameplay[]>(PENDING_GAMEPLAY_KEY)) ?? []
    )
  }

  private playerAddresses(match: MatchmakerStartMatchMessage) {
    return [
      normalizedAddress(match.player1.account.address),
      normalizedAddress(match.player2.account.address)
    ]
  }

  private playerIndex(match: MatchmakerStartMatchMessage, principal: string) {
    const index = this.playerAddresses(match).indexOf(normalizedAddress(principal))
    if (index < 0) throw new Error('player is not in match')
    return index as Player
  }

  private opponentAddress(match: MatchmakerStartMatchMessage, principal: string) {
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
      const attachment = socket.deserializeAttachment() as SocketAttachment | null
      if (attachment?.joined) this.safeSend(socket, message)
    }
  }

  private broadcast(message: GameServerMessage) {
    for (const socket of this.state.getWebSockets()) {
      const attachment = socket.deserializeAttachment() as SocketAttachment | null
      if (attachment?.joined) this.safeSend(socket, message)
    }
  }

  private safeSend(socket: WebSocket, message: object | string) {
    try {
      socket.send(typeof message === 'string' ? message : JSON.stringify(message))
    } catch {
      // Close/error handlers own cleanup.
    }
  }

  private isInternal(request: Request) {
    return (
      this.env.INTERNAL_AUTH_SECRET.length >= 16 &&
      request.headers.get(INTERNAL_AUTH_HEADER) === this.env.INTERNAL_AUTH_SECRET
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
