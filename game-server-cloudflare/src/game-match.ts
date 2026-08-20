import { GameMode, MatchStatus, type Reward } from '@opensky/proto'
import { encode, VERSION } from '@opensky/deck-string-codec'
import {
  EmoteMessage,
  GameServerMessage,
  JoinServerMessage,
  type RecentMatchInfo,
  SpectateServerMessage
} from '@opensky/shared/game-server-message-types'
import { MatchmakerStartMatchMessage } from '@opensky/shared/matchmaker-message-types'
import { ReplayAnalyticsMessage } from '@opensky/shared/gameAnalytics'
import { prismsToDeckClass } from '@opensky/shared/helpers'
import {
  conquestMatchMode,
  isRankedMatchModes
} from '@opensky/shared/match-modes'
import { HeroSkinLibrary } from '@opensky/shared/cosmetics'
import { WEBSOCKET_FORCED_CLOSE_CODE } from '@opensky/shared/constants'
import { normalizeGoogleUUID } from '@opensky/shared/uuid'
import { Player, PrivateSeed, Rarity } from '@skyweaver/state-metadata'

import { addressBytesToHex, bytesToHex } from './encoding'
import {
  isLeavePenaltyMode,
  readAbandonPenaltyConfig,
  recordAbandonPenalty
} from './abandon-penalties'
import {
  persistAuthoritativeMatchDecks,
  realDeckStringsFromFilledDecks,
  type RealDeckStrings
} from './authoritative-decks'
import { applyConquestPoints } from './conquest-points'
import { settleConquestRewardsForMatch } from './conquest-settlement'
import { publishMatchCompletion } from './completion-publication'
import type { RankedSettlementReceipt } from './deck-ranks'
import {
  applyConquestProgress,
  applyMatchExperience,
  applyMatchProgression,
  applyWarmUpProgress,
  warmUpProgressPlayer
} from './progression'
import {
  AcceptedClientMessage,
  CreateMatchRequest,
  GameProtocolError,
  INTERNAL_AUTH_HEADER,
  parseClientMessage,
  stateError,
  TRUSTED_ANONYMOUS_SPECTATOR_HEADER,
  TRUSTED_PRINCIPAL_HEADER,
  TRUSTED_USER_ID_HEADER
} from './protocol'
import {
  AuthoritativeMatchRuntime,
  MatchQuestRuntimeState,
  normalizePrivateSeed
} from './state-runtime'
import { sourceRewardListWire } from './reward-wire'

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
  DECK_RANK_COORDINATOR: DurableObjectNamespace
  AUTH_DB: D1Database
  GAME_ANALYTICS_QUEUE?: Queue<ReplayAnalyticsMessage>
  GAME_ANALYTICS?: R2Bucket
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
  expiredBeforeLoad?: boolean
  completionRecorded?: boolean
  analyticsEnqueuedAt?: string
  // Source ThreadPlayerContext.realDeckString values, captured once from the
  // first materialized WASM state's secret.filledDeck values.
  realDeckStrings?: RealDeckStrings
}

export interface ReplayArchiveResult {
  archivePrefix: string
  replayRecordCount: number
  replayBytes: number
}

export const archiveReplayRecords = async (
  bucket: R2Bucket,
  input: {
    proposalId: string
    replayId: string
    releaseVersion: string
    matchId: number
    endedAt: string
    records: Array<{ index: number; body: string }>
  }
): Promise<ReplayArchiveResult> => {
  const archive = [...input.records].sort(
    (left, right) => left.index - right.index
  )
  if (
    archive.length < 1 ||
    archive.length > 10_000 ||
    archive.some((record, index) => record.index !== index)
  ) {
    throw new Error('match replay archive is incomplete')
  }
  const replayBytes = archive.reduce(
    (total, record) => total + new TextEncoder().encode(record.body).byteLength,
    0
  )
  if (replayBytes < 1 || replayBytes > 100 * 1024 * 1024) {
    throw new Error('match replay archive size is invalid')
  }
  const archivePrefix = `replays/${input.releaseVersion}/${input.proposalId}/`
  for (let start = 0; start < archive.length; start += 10) {
    await Promise.all(
      archive.slice(start, start + 10).map(record =>
        bucket.put(
          `${archivePrefix}${String(record.index).padStart(6, '0')}.json`,
          record.body,
          {
            httpMetadata: { contentType: 'application/json' },
            customMetadata: {
              proposalId: input.proposalId,
              replayId: input.replayId,
              releaseVersion: input.releaseVersion
            }
          }
        )
      )
    )
  }
  await bucket.put(
    `${archivePrefix}manifest.json`,
    JSON.stringify({
      proposalId: input.proposalId,
      matchId: input.matchId,
      replayId: input.replayId,
      releaseVersion: input.releaseVersion,
      endedAt: input.endedAt,
      replayRecordCount: archive.length,
      replayBytes
    }),
    { httpMetadata: { contentType: 'application/json' } }
  )
  return { archivePrefix, replayRecordCount: archive.length, replayBytes }
}

interface MatchResult {
  winner?: Player
  turnCount?: number
  moveCount?: number
  player1Moves?: number
  player2Moves?: number
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
  loadExpiryAtMs?: number
  commitRevealAtMs?: number
  turnAtMs?: number
  lastTurnCount?: number
  lastMoveCount?: number
  playerMoves?: [number, number]
  botAtMs?: number
  botFailureCount?: number
  botActionCount?: number
  botPlayedManaVial?: boolean
  botFailureCounts?: [number, number]
  botActionCounts?: [number, number]
  botPlayedManaVials?: [boolean, boolean]
}

interface PendingGameplay {
  principal: string
  data: string[]
}

const addPlayerMoveDeltas = (timers: MatchTimers, deltas: [number, number]) => {
  const current = timers.playerMoves ?? [0, 0]
  timers.playerMoves = [current[0] + deltas[0], current[1] + deltas[1]]
}

interface SocketAttachment {
  principal: string
  userId: string
  anonymousSpectator?: boolean
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

interface CompletedMatchRow {
  result_json: string | null
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

export const botDifficultyForParticipant = (
  proposalId: string,
  match: MatchmakerStartMatchMessage,
  player: Player
) => {
  const participants = [match.player1, match.player2]
  const isReadinessDrill =
    proposalId.startsWith('readiness-drill-match-') &&
    participants.every(
      participant =>
        typeof participant.botSubkey === 'string' &&
        participant.gameMode === GameMode.CONQUEST_CONSTRUCTED
    )
  // The synthetic drill target must traverse the three-win settlement path;
  // opponents remain real source bots but intentionally take the easiest
  // policy. No player-facing or ordinary bot match uses this asymmetry.
  if (isReadinessDrill) return player === 0 ? 1 : 0
  return match.matchSettings.botDifficulty ?? 0.5
}

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
    if (!normalizeGoogleUUID(participant.playerSessionID)) {
      throw new Error('invalid player session ID')
    }
    if (
      participant.botSubkey !== false &&
      !/^(?:0x)?[0-9a-f]{64}$/i.test(participant.botSubkey)
    ) {
      throw new Error('invalid bot subkey')
    }
  }
  if (
    [match.player1, match.player2].every(
      participant => typeof participant.botSubkey === 'string'
    ) &&
    (!request.proposalId.startsWith('readiness-drill-match-') ||
      match.player1.gameMode !== GameMode.CONQUEST_CONSTRUCTED ||
      match.player2.gameMode !== GameMode.CONQUEST_CONSTRUCTED)
  ) {
    throw new Error('bot-only matches are reserved for Conquest readiness')
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
      playerSessionID:
        normalizeGoogleUUID(request.match.player1.playerSessionID) ??
        request.match.player1.playerSessionID,
      privateSeed: normalizePrivateSeed(
        request.match.player1.privateSeed as PrivateSeed
      )
    },
    player2: {
      ...request.match.player2,
      playerSessionID:
        normalizeGoogleUUID(request.match.player2.playerSessionID) ??
        request.match.player2.playerSessionID,
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
      if (url.pathname === '/internal/recent-match-info')
        return await this.recentMatchInfo(request)
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
          // Source MatchManager.handleLoadingProgress returns while the socket
          // has no linked match context. Ignore this bootstrap race without
          // mutating durable loading state or closing the connection.
          if (role === 'player' && message.type === 'player_loading_progress') {
            return
          }
          const bootstrapAllowed =
            message.type === 'timesync' ||
            (role === 'player' && message.type === 'join_server') ||
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
          if (metadata.expiredBeforeLoad) {
            await this.recordUnloadedExpiryWithRetry(metadata, Date.now())
          } else {
            await this.recordCompletionWithRetry(
              metadata,
              Date.now(),
              await this.questProgress()
            )
          }
        } else if (
          !metadata.expiredBeforeLoad &&
          !metadata.analyticsEnqueuedAt
        ) {
          await this.archiveAndEnqueueAnalyticsWithRetry(metadata, Date.now())
        }
        return
      }
      const [players, timers] = await Promise.all([
        this.players(),
        this.timers()
      ])
      const now = Date.now()
      const runtime = await this.ensureRuntime()
      if (
        !metadata.started &&
        timers.loadExpiryAtMs === undefined &&
        !Object.values(players).every(player => player.finishedLoadingAssets)
      ) {
        // Backfill Durable Objects created before the dedicated load-expiry
        // timer was introduced. The original creation time keeps rollout from
        // granting an extra grace period.
        timers.loadExpiryAtMs =
          metadata.createdAtMs + this.settings.abandonTimeoutMs
      }

      const expiredPlayer = Object.entries(players).find(
        ([, player]) =>
          player.abandonAtMs !== undefined && player.abandonAtMs <= now
      )
      let emitted: string[] = []
      if (timers.loadExpiryAtMs !== undefined && timers.loadExpiryAtMs <= now) {
        timers.loadExpiryAtMs = undefined
        const loadedPlayers = Object.entries(players).filter(
          ([, player]) => player.finishedLoadingAssets
        )
        if (loadedPlayers.length === 0) {
          await this.expireUnloadedMatch(metadata, players, timers, now)
          return
        }
        if (loadedPlayers.length === 1) {
          const absentPrincipal = Object.keys(players).find(
            principal => principal !== loadedPlayers[0][0]
          )!
          emitted = this.dispatchAbandonFromAnyState(
            runtime,
            this.playerIndex(metadata.match, absentPrincipal)
          )
        }
      } else if (expiredPlayer) {
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
      await this.repairIdempotentCreation(existing)
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
    const botApprovalDiffs = [input.match.player1, input.match.player2].flatMap(
      participant =>
        typeof participant.botSubkey === 'string'
          ? runtime.approveSubkey(
              participant.account.address,
              addressBytesToHex(participant.privateSeed.subkey)
            )
          : []
    )
    const replay = runtime.initialReplayState()
    const replayInit = this.replayJson([
      {
        type: 'init',
        version: input.releaseVersion,
        players: [input.match.player1, input.match.player2].map(
          participant => ({
            id: participant.account.address,
            name: participant.account.name || 'unknown_name',
            initDeckString:
              encode(
                VERSION,
                participant.privateSeed.cards,
                prismsToDeckClass(participant.privateSeed.prisms)
              ) ?? '',
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
    const initialStorage: Record<string, unknown> = {
      [METADATA_KEY]: metadata,
      [SNAPSHOT_KEY]: runtime.snapshot(),
      [PLAYERS_KEY]: players,
      [TIMERS_KEY]: {} satisfies MatchTimers,
      [PENDING_GAMEPLAY_KEY]: [] satisfies PendingGameplay[],
      [QUEST_RUNTIME_KEY]: runtime.questRuntimeState(),
      [QUEST_PROGRESS_KEY]: runtime.questProgress(),
      [REPLAY_NEXT_INDEX_KEY]: botApprovalDiffs.length > 0 ? 2 : 1,
      [`${REPLAY_RECORD_PREFIX}000000`]: replayInit
    }
    if (botApprovalDiffs.length > 0) {
      initialStorage[`${REPLAY_RECORD_PREFIX}000001`] = this.replayJson([
        {
          type: 'gameplay',
          timestamp: new Date().toISOString(),
          message: { type: 'gameplay', data: botApprovalDiffs }
        }
      ])
    }
    await this.state.storage.put(initialStorage)
    await this.afterStateChange(metadata, players, {}, Date.now())
    return this.creationResponse(metadata)
  }

  private async repairIdempotentCreation(metadata: MatchMetadata) {
    const [players, timers] = await Promise.all([this.players(), this.timers()])
    const now = Date.now()

    if (
      !metadata.started &&
      !metadata.ended &&
      timers.loadExpiryAtMs === undefined &&
      !Object.values(players).every(player => player.finishedLoadingAssets)
    ) {
      timers.loadExpiryAtMs =
        metadata.createdAtMs + this.settings.abandonTimeoutMs
      await this.state.storage.put(TIMERS_KEY, timers)
    }

    // Initial storage is intentionally installed before afterStateChange so a
    // retry can recover it. If that second step failed, the pre-start runtime
    // has no commit/reveal deadline. Re-run it only in that impossible healthy
    // state so an ordinary retry never extends an existing deadline.
    if (
      !metadata.started &&
      !metadata.ended &&
      timers.commitRevealAtMs === undefined
    ) {
      await this.afterStateChange(metadata, players, timers, now)
      return
    }
    if (metadata.ended) return

    // Durable storage may contain the completed state write even when the
    // subsequent setAlarm call failed. Restore a missing or later alarm from
    // the persisted deadlines, scheduling overdue work immediately.
    const nextDeadline = [
      timers.commitRevealAtMs,
      timers.loadExpiryAtMs,
      timers.turnAtMs,
      timers.botAtMs,
      ...Object.values(players).map(player => player.abandonAtMs)
    ]
      .filter((value): value is number => value !== undefined)
      .sort((left, right) => left - right)[0]
    if (nextDeadline === undefined) return
    const expectedAlarm = Math.max(now, nextDeadline)
    const currentAlarm = await this.state.storage.getAlarm()
    if (currentAlarm === null || currentAlarm > expectedAlarm) {
      await this.state.storage.setAlarm(expectedAlarm)
    }
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
      completionRecorded: metadata.completionRecorded === true,
      analyticsEnqueuedAt: metadata.analyticsEnqueuedAt,
      sockets: this.state.getWebSockets().length
    })
  }

  private async recentMatchInfo(request: Request) {
    if (!this.isInternal(request))
      return new Response('Not found', { status: 404 })
    const principal = normalizedAddress(
      request.headers.get(TRUSTED_PRINCIPAL_HEADER) ?? ''
    )
    if (!/^0x[0-9a-f]{40}$/.test(principal)) {
      return new Response('Invalid player', { status: 400 })
    }
    const metadata = await this.metadata()
    if (
      !metadata?.ended ||
      !metadata.completionRecorded ||
      metadata.expiredBeforeLoad
    ) {
      return new Response('Recent match not found', { status: 404 })
    }
    let index: Player
    try {
      index = this.playerIndex(metadata.match, principal)
    } catch {
      return new Response('Recent match not found', { status: 404 })
    }
    const runtime = await this.ensureRuntime()
    const participant =
      index === 0 ? metadata.match.player1 : metadata.match.player2
    const info: RecentMatchInfo = {
      type: 'recent_match_info',
      playerID: principal,
      gameMode: participant.gameMode,
      matchID: metadata.match.matchID,
      replayID: metadata.match.replayID,
      accounts: [
        metadata.match.player1.account,
        metadata.match.player2.account
      ],
      store: bytesToHex(runtime.serialize((index + 1) as 1 | 2)),
      rewards: await this.completedRewards(metadata.proposalId, index)
    }
    if (
      metadata.match.player1.gameMode === GameMode.CONQUEST_CONSTRUCTED ||
      metadata.match.player1.gameMode === GameMode.CONQUEST_DISCOVERY
    ) {
      info.conquestInfo = [
        metadata.match.player1.conquestInfo!,
        metadata.match.player2.conquestInfo!
      ]
    }
    return Response.json(info, {
      headers: {
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff'
      }
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
    const anonymousSpectator =
      request.headers.get(TRUSTED_ANONYMOUS_SPECTATOR_HEADER) === '1'
    if (anonymousSpectator && role !== 'spectator') {
      return new Response('Not authorized for match', { status: 401 })
    }
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
      anonymousSpectator,
      role,
      joined: false,
      connectedAtMs: Date.now()
    }
    server.serializeAttachment(attachment)
    this.state.acceptWebSocket(server, [principal])
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
    if (metadata.expiredBeforeLoad) {
      throw new GameProtocolError('match ended or cannot be found.')
    }
    if (metadata.ended) {
      // The source authenticates a recent-match connection but does not link
      // it to the live MatchProxy. Keep this socket detached so another recent
      // connection cannot displace it or turn it into a live player session.
      const index = this.playerIndex(metadata.match, attachment.principal)
      this.safeSend(
        socket,
        this.reconnectMessage(
          metadata,
          runtime,
          index,
          Number.MAX_SAFE_INTEGER,
          false
        )
      )
      if (metadata.completionRecorded) {
        this.safeSend(socket, {
          type: 'rewards',
          data: await this.completedRewards(metadata.proposalId, index)
        })
      }
      return
    }
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
    this.displaceOtherSockets(socket, attachment.principal)
    const players = await this.players()
    const player = players[attachment.principal]
    player.connected = true
    player.joined = true
    player.abandonAtMs = undefined
    await this.state.storage.put({
      [PLAYERS_KEY]: players,
      [SNAPSHOT_KEY]: runtime.snapshot()
    })

    const index = this.playerIndex(metadata.match, attachment.principal)
    const timers = await this.timers()
    const reconnect = this.reconnectMessage(
      metadata,
      runtime,
      index,
      timers.turnAtMs ?? 0,
      !metadata.started,
      player.opponentMuted
    )
    this.safeSend(socket, reconnect)
    this.sendToOpponent(metadata.match, attachment.principal, {
      type: 'opponent_connected'
    })
    this.sendToSpectators({ type: 'opponent_connected' })
    if (this.spectatorSockets(attachment.principal).length > 0) {
      this.updateSpectators(attachment.principal)
    }
    await this.updateLoading(attachment.principal, message.loadingProgress)
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
    this.displaceOtherSockets(socket, attachment.principal)

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
    // The source records completion as a one-way transition. A stale or
    // reordered progress message cannot make an already-loaded player a
    // no-show again.
    const newlyFinishedLoading =
      !player.finishedLoadingAssets &&
      Math.max(player.loadingProgress, progress) >= 1
    player.loadingProgress = Math.max(player.loadingProgress, progress)
    player.finishedLoadingAssets ||= player.loadingProgress >= 1
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
    const allPlayersLoaded = Object.values(players).every(
      current => current.finishedLoadingAssets
    )
    if (allPlayersLoaded) {
      const loadingComplete = {
        type: 'opponent_loading_progress',
        progress: 1,
        matchAbandonTime: -1
      } as const
      this.sendToPrincipal(principal, loadingComplete)
      this.sendToSpectators(loadingComplete)
    }
    // Source MatchHandler only invokes match-state/timer work inside the
    // one-way false -> true transition. Repeated or fractional UI progress is
    // relayed above but must never refresh an authoritative deadline.
    if (!newlyFinishedLoading) return
    if (allPlayersLoaded) {
      await this.flushPendingGameplay(metadata, players)
      await this.afterStateChange(
        metadata,
        players,
        await this.timers(),
        Date.now(),
        true
      )
      return
    }
    // With no materialized game state, the first loaded player does not alter
    // the original commit/reveal grace deadline. A legacy/partially advanced
    // match that already has state retains the source timer-repair behavior.
    if (!(await this.ensureRuntime()).stateInfo().hasState) return
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
      if (metadata.completionRecorded) {
        this.finishMatchSockets(principal)
      }
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
    const timers = await this.timers()
    addPlayerMoveDeltas(timers, result.playerMoveDeltas)
    await this.afterStateChange(metadata, players, timers, Date.now())
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
      if (attachment.anonymousSpectator) {
        throw new GameProtocolError('player used unowned sticker')
      }
      const owned = await this.env.AUTH_DB.prepare(
        `SELECT 1 FROM player_items
         WHERE user_id = ? AND item_type = 'SW_STICKERS'
           AND token_id = ? AND balance > 0`
      )
        .bind(attachment.userId, message.sticker)
        .first()
      if (!owned) throw new GameProtocolError('player used unowned sticker')
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
    if ('sticker' in message) {
      const participant =
        this.playerIndex(metadata.match, principal) === 0
          ? metadata.match.player1
          : metadata.match.player2
      if (
        !participant.account.deckEquipment?.stickers?.includes(message.sticker)
      ) {
        throw new GameProtocolError('player used unowned sticker')
      }
    }
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

  private async afterStateChange(
    metadata: MatchMetadata,
    players: PlayerStateMap,
    timers: MatchTimers,
    now: number,
    newlyLoaded = false
  ) {
    const runtime = await this.ensureRuntime()
    const info = runtime.stateInfo()
    if (info.hasState) this.captureRealDeckStrings(metadata, runtime)
    const allPlayersLoaded = Object.values(players).every(
      player => player.finishedLoadingAssets
    )
    if (allPlayersLoaded) {
      timers.loadExpiryAtMs = undefined
    } else if (!metadata.started) {
      timers.loadExpiryAtMs ??=
        metadata.createdAtMs + this.settings.abandonTimeoutMs
    }
    if (info.statusType === 'GameOver') {
      metadata.ended = true
      metadata.endedAtMs ??= now
      metadata.result ??= {
        winner: info.winner,
        turnCount: info.turnCount,
        moveCount: info.moveCount,
        player1Moves: timers.playerMoves?.[0] ?? 0,
        player2Moves: timers.playerMoves?.[1] ?? 0,
        status:
          info.lastActionType === 'Abandon'
            ? MatchStatus.ABANDONED
            : info.lastActionType === 'Concede'
              ? MatchStatus.FORFEITED
              : MatchStatus.COMPLETED
      }
      timers.commitRevealAtMs = undefined
      timers.loadExpiryAtMs = undefined
      timers.turnAtMs = undefined
      timers.botAtMs = undefined
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
      if (stateAdvanced) {
        timers.botFailureCount = 0
        timers.botFailureCounts = [0, 0]
      }
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
      const bot = this.botParticipant(metadata.match, info)
      const failureCount =
        bot === undefined
          ? 0
          : (timers.botFailureCounts?.[bot.index] ??
            timers.botFailureCount ??
            0)
      if (bot && failureCount < 3) {
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
      const runtime = await this.ensureRuntime()
      const capturedRealDecks = this.captureRealDeckStrings(metadata, runtime)
      if (capturedRealDecks) {
        await this.state.storage.put(METADATA_KEY, metadata)
      }
      if (!metadata.realDeckStrings) {
        throw new Error('authoritative match decks are unavailable')
      }
      const gameModes: [GameMode, GameMode] = [
        metadata.match.player1.gameMode,
        metadata.match.player2.gameMode
      ]
      const winner = metadata.result?.winner
      const status = metadata.result?.status ?? MatchStatus.COMPLETED
      await persistAuthoritativeMatchDecks(
        this.env.AUTH_DB,
        metadata.proposalId,
        metadata.realDeckStrings,
        endedAt
      )
      const progression = await applyMatchProgression(
        this.env.AUTH_DB,
        metadata.proposalId,
        questProgress,
        endedAt
      )
      await applyWarmUpProgress(
        this.env.AUTH_DB,
        metadata.proposalId,
        gameModes,
        winner,
        status,
        endedAt
      )
      const conquestPoints = await applyConquestPoints(
        this.env.AUTH_DB,
        metadata.proposalId,
        winner,
        status,
        metadata.result?.turnCount ?? 0,
        endedAt
      )
      await applyConquestProgress(
        this.env.AUTH_DB,
        metadata.proposalId,
        winner,
        endedAt
      )
      const conquestCards = await settleConquestRewardsForMatch(
        this.env.AUTH_DB,
        metadata.proposalId,
        endedAt
      )
      const deckRanksResponse = await this.env.DECK_RANK_COORDINATOR.getByName(
        'current-library'
      ).fetch(
        new Request('https://deck-rank-coordinator/internal/apply', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            [INTERNAL_AUTH_HEADER]: this.env.INTERNAL_AUTH_SECRET
          },
          body: JSON.stringify({
            proposalId: metadata.proposalId,
            season: metadata.match.matchSettings.season,
            winner,
            status,
            processedAt: endedAt
          })
        })
      )
      if (!deckRanksResponse.ok) {
        throw new Error(
          `deck-rank coordinator returned ${deckRanksResponse.status}`
        )
      }
      const { stats } = await deckRanksResponse.json<RankedSettlementReceipt>()
      const experience = await applyMatchExperience(
        this.env.AUTH_DB,
        metadata.proposalId,
        metadata.match.matchSettings.season,
        gameModes,
        winner,
        status,
        metadata.result?.turnCount ?? 0,
        endedAt,
        stats.rewards
      )
      const rewards: [Reward[], Reward[]] = [
        sourceRewardListWire([
          ...progression.rewards[0],
          ...conquestPoints.rewards[0],
          ...conquestCards[0],
          ...stats.rewards[0],
          ...experience.rewards[0]
        ] as Reward[]),
        sourceRewardListWire([
          ...progression.rewards[1],
          ...conquestPoints.rewards[1],
          ...conquestCards[1],
          ...stats.rewards[1],
          ...experience.rewards[1]
        ] as Reward[])
      ]
      if (status === MatchStatus.ABANDONED && winner !== undefined) {
        const loser = winner === 0 ? 1 : 0
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
      const conquestMode = conquestMatchMode(gameModes)
      const loser = winner === undefined ? undefined : winner === 0 ? 1 : 0
      await publishMatchCompletion(this.env.AUTH_DB, {
        proposalId: metadata.proposalId,
        winner,
        result: {
          ...(metadata.result ?? {}),
          questProgress: progression.questProgress,
          rewards
        },
        endedAt,
        requirements: {
          rankedStats: isRankedMatchModes(gameModes),
          warmUpProgress:
            warmUpProgressPlayer(gameModes, winner, status) !== undefined,
          conquestMode,
          abandonPenalty:
            status === MatchStatus.ABANDONED &&
            loser !== undefined &&
            isLeavePenaltyMode(gameModes[loser])
        }
      })
      // The source does not send rewards or its terminal client signal until
      // InternalMatchEnd returns. Persist this retry boundary first so a
      // reconnect can safely replay both messages after an interrupted send.
      metadata.completionRecorded = true
      await this.state.storage.put(METADATA_KEY, metadata)
      const principals = this.playerAddresses(metadata.match)
      for (const player of [0, 1] as const) {
        this.sendToPrincipal(principals[player], {
          type: 'rewards',
          data: rewards[player]
        })
      }
      this.finishMatchSockets()
      await this.archiveAndEnqueueAnalyticsWithRetry(metadata, now)
    } catch (error) {
      console.error(
        'match completion recording failed',
        metadata.proposalId,
        error
      )
      await this.state.storage.setAlarm(now + 10_000)
    }
  }

  private async archiveAndEnqueueAnalyticsWithRetry(
    metadata: MatchMetadata,
    now: number
  ) {
    if (
      metadata.analyticsEnqueuedAt ||
      metadata.expiredBeforeLoad ||
      !metadata.completionRecorded
    ) {
      return
    }
    // Analytics is an optional observational adapter. Production must not
    // block authoritative completion alarms while R2/the consumer are absent.
    if (!this.env.GAME_ANALYTICS || !this.env.GAME_ANALYTICS_QUEUE) {
      await this.state.storage.deleteAlarm()
      return
    }
    try {
      const endedAt = new Date(metadata.endedAtMs ?? now).toISOString()
      const records = await this.state.storage.list<string>({
        prefix: REPLAY_RECORD_PREFIX
      })
      const archive = [...records.entries()]
        .map(([key, body]) => ({
          index: Number(key.slice(REPLAY_RECORD_PREFIX.length)),
          body
        }))
        .filter(record => Number.isSafeInteger(record.index))
        .sort((left, right) => left.index - right.index)
      if (
        archive.length < 1 ||
        archive.length > 10_000 ||
        archive.some((record, index) => record.index !== index)
      ) {
        throw new Error('match replay archive is incomplete')
      }
      const releaseVersion = metadata.releaseVersion ?? 'cloud-weasel'
      const archived = await archiveReplayRecords(this.env.GAME_ANALYTICS, {
        proposalId: metadata.proposalId,
        replayId: metadata.match.replayID,
        releaseVersion,
        matchId: metadata.match.matchID,
        endedAt,
        records: archive
      })
      await this.env.GAME_ANALYTICS_QUEUE.send(
        {
          type: 'process-match-replay',
          proposalId: metadata.proposalId,
          matchId: metadata.match.matchID,
          replayId: metadata.match.replayID,
          releaseVersion,
          endedAt,
          archivePrefix: archived.archivePrefix,
          replayRecordCount: archived.replayRecordCount,
          replayBytes: archived.replayBytes
        },
        { contentType: 'json' }
      )
      metadata.analyticsEnqueuedAt = new Date(now).toISOString()
      await this.state.storage.put(METADATA_KEY, metadata)
      await this.state.storage.deleteAlarm()
    } catch (error) {
      console.error(
        'match analytics archive/enqueue failed',
        metadata.proposalId,
        error
      )
      await this.state.storage.setAlarm(now + 10_000)
    }
  }

  private async expireUnloadedMatch(
    metadata: MatchMetadata,
    players: PlayerStateMap,
    timers: MatchTimers,
    now: number
  ) {
    metadata.ended = true
    metadata.endedAtMs ??= now
    metadata.expiredBeforeLoad = true
    timers.loadExpiryAtMs = undefined
    timers.commitRevealAtMs = undefined
    timers.turnAtMs = undefined
    timers.botAtMs = undefined
    await this.state.storage.put({
      [METADATA_KEY]: metadata,
      [PLAYERS_KEY]: players,
      [TIMERS_KEY]: timers
    })
    await this.recordUnloadedExpiryWithRetry(metadata, now)
  }

  private async recordUnloadedExpiryWithRetry(
    metadata: MatchMetadata,
    now: number
  ) {
    try {
      const endedAt = new Date(metadata.endedAtMs ?? now).toISOString()
      const result = await this.env.AUTH_DB.prepare(
        `UPDATE multiplayer_matches
         SET status = 'ended', winner_player = NULL, result_json = ?,
             ended_at = ?, updated_at = ?
         WHERE proposal_id = ? AND status IN ('active', 'ended')`
      )
        .bind(
          JSON.stringify({ reason: 'players_did_not_load' }),
          endedAt,
          endedAt,
          metadata.proposalId
        )
        .run()
      if ((result.meta.changes ?? 0) < 1) {
        throw new Error('active match ledger row was not found')
      }
      metadata.completionRecorded = true
      await this.state.storage.put(METADATA_KEY, metadata)
      this.finishMatchSockets()
      await this.state.storage.deleteAlarm()
    } catch (error) {
      console.error(
        'unloaded match expiry recording failed',
        metadata.proposalId,
        error
      )
      await this.state.storage.setAlarm(now + 10_000)
    }
  }

  private reconnectMessage(
    metadata: MatchMetadata,
    runtime: AuthoritativeMatchRuntime,
    index: Player,
    turnExpiryTime: number,
    isGameStart: boolean,
    opponentMuted = false
  ): GameServerMessage {
    const reconnect: GameServerMessage = {
      type: 'reconnect',
      accounts: [
        metadata.match.player1.account,
        metadata.match.player2.account
      ],
      store: bytesToHex(runtime.serialize((index + 1) as 1 | 2)),
      turnExpiryTime,
      isGameStart,
      replayID: metadata.match.replayID,
      opponentMuted,
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
    return reconnect
  }

  private async completedRewards(
    proposalId: string,
    player: Player
  ): Promise<Reward[]> {
    const row = await this.env.AUTH_DB.prepare(
      `SELECT result_json FROM multiplayer_matches
       WHERE proposal_id = ? AND status = 'ended'`
    )
      .bind(proposalId)
      .first<CompletedMatchRow>()
    if (!row?.result_json) return []
    try {
      const result = JSON.parse(row.result_json) as { rewards?: unknown }
      if (
        !Array.isArray(result.rewards) ||
        !Array.isArray(result.rewards[player])
      ) {
        return []
      }
      return sourceRewardListWire(result.rewards[player] as Reward[])
    } catch {
      return []
    }
  }

  private async scheduleAlarm(
    players: PlayerStateMap,
    timers: MatchTimers,
    now: number
  ) {
    const candidates = [
      timers.loadExpiryAtMs,
      timers.commitRevealAtMs,
      timers.turnAtMs,
      timers.botAtMs,
      ...Object.values(players).map(player => player.abandonAtMs)
    ]
      .filter((value): value is number => value !== undefined)
      .sort((left, right) => left - right)
    if (candidates[0] !== undefined)
      await this.state.storage.setAlarm(Math.max(now, candidates[0]))
    else await this.state.storage.deleteAlarm()
  }

  private async runBotAction(
    metadata: MatchMetadata,
    timers: MatchTimers,
    runtime: AuthoritativeMatchRuntime
  ) {
    const bot = this.botParticipant(metadata.match, runtime.stateInfo())
    if (!bot || metadata.ended) return
    const actionCounts = timers.botActionCounts ?? [0, 0]
    const playedManaVials = timers.botPlayedManaVials ?? [false, false]
    const result = await runtime.createBotAction(
      bot.index,
      bot.participant.botSubkey as string,
      addressBytesToHex(bot.participant.privateSeed.subkey),
      botDifficultyForParticipant(
        metadata.proposalId,
        metadata.match,
        bot.index
      ),
      {
        actionCount:
          timers.botActionCounts?.[bot.index] ?? timers.botActionCount ?? 0,
        playedManaVial:
          timers.botPlayedManaVials?.[bot.index] ??
          timers.botPlayedManaVial ??
          false
      }
    )
    actionCounts[bot.index] = result.policy.actionCount
    playedManaVials[bot.index] = result.policy.playedManaVial
    timers.botActionCounts = actionCounts
    timers.botPlayedManaVials = playedManaVials
    if (this.botParticipants(metadata.match).length === 1) {
      // Keep the original scalar fields for Durable Objects created before
      // per-player bot policy state and for operational status compatibility.
      timers.botActionCount = result.policy.actionCount
      timers.botPlayedManaVial = result.policy.playedManaVial
    }
    if (result.diffs.length === 0) {
      const failureCounts = timers.botFailureCounts ?? [0, 0]
      failureCounts[bot.index] =
        (timers.botFailureCounts?.[bot.index] ?? timers.botFailureCount ?? 0) +
        1
      timers.botFailureCounts = failureCounts
      if (this.botParticipants(metadata.match).length === 1) {
        timers.botFailureCount = failureCounts[bot.index]
      }
      console.error('bot did not produce an action', {
        matchId: metadata.match.matchID,
        player: bot.index,
        failures: failureCounts[bot.index]
      })
      return
    }
    const applied = runtime.applyClientDiffs(result.diffs)
    addPlayerMoveDeltas(timers, applied.playerMoveDeltas)
    const failureCounts = timers.botFailureCounts ?? [0, 0]
    failureCounts[bot.index] = 0
    timers.botFailureCounts = failureCounts
    if (this.botParticipants(metadata.match).length === 1) {
      timers.botFailureCount = 0
    }
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

  private dispatchAbandonFromAnyState(
    runtime: AuthoritativeMatchRuntime,
    player: Player
  ) {
    const emitted: string[] = []
    // Source Match.tryDispatch first drives the commit/reveal store into a
    // ready match state. Abandon is not a valid action against a pending store.
    for (let attempt = 0; !runtime.stateInfo().hasState; attempt += 1) {
      if (attempt >= 6) {
        throw new Error(
          'commit-reveal state did not become ready before abandon'
        )
      }
      emitted.push(...runtime.dispatchTimeout())
    }
    emitted.push(...runtime.dispatchAbandon(player))
    return emitted
  }

  private botParticipants(match: MatchmakerStartMatchMessage) {
    const participants = [match.player1, match.player2] as const
    return participants.flatMap((participant, index) =>
      typeof participant.botSubkey === 'string'
        ? [{ index: index as Player, participant }]
        : []
    )
  }

  private botParticipant(
    match: MatchmakerStartMatchMessage,
    state: {
      currentPlayer?: Player
      playersDoneCardSelection?: [boolean, boolean]
    }
  ) {
    const bots = this.botParticipants(match)
    if (state.playersDoneCardSelection) {
      const current = bots.find(
        bot =>
          bot.index === state.currentPlayer &&
          state.playersDoneCardSelection?.[bot.index] === false
      )
      if (current) return current
      const selecting = bots.find(
        bot => state.playersDoneCardSelection?.[bot.index] === false
      )
      if (selecting) return selecting
    }
    return bots.find(bot => bot.index === state.currentPlayer)
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
      this.state.getWebSockets(attachment.principal).some(other => {
        if (other.readyState !== WebSocket.OPEN) return false
        const otherAttachment =
          other.deserializeAttachment() as SocketAttachment | null
        return (
          otherAttachment?.joined === true &&
          (otherAttachment.role ?? 'player') === 'player'
        )
      })
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
    const timers = await this.timers()
    // Source behavior only advances immediately when the authoritative owner,
    // represented by `store.player === undefined`, owes the reveal.
    if (!info.hasState && info.pendingPlayer === undefined) {
      const emitted = runtime.dispatchTimeout()
      if (emitted.length > 0) {
        this.broadcast({ type: 'gameplay', data: emitted })
        await this.replayGameplay(emitted)
      }
      await this.afterStateChange(metadata, players, timers, Date.now())
      return
    }
    // A player-owned pending reveal already has a source commit/reveal timer.
    // Disconnect adds the independent abandon deadline but must not replace or
    // extend the reveal deadline. A materialized game likewise keeps its turn
    // timer unchanged until an authoritative action advances state.
    await this.state.storage.put(PLAYERS_KEY, players)
    await this.scheduleAlarm(players, timers, Date.now())
  }

  private replayRecordKey(index: number) {
    return `${REPLAY_RECORD_PREFIX}${String(index).padStart(6, '0')}`
  }

  private replayJson(value: unknown) {
    const body = JSON.stringify(value, function (key, current) {
      const original = this[key]
      if (original instanceof Map) {
        return { dataType: 'Map', value: [...original.entries()] }
      }
      return original instanceof Uint8Array ? bytesToHex(original) : current
    })
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

  private captureRealDeckStrings(
    metadata: MatchMetadata,
    runtime: AuthoritativeMatchRuntime
  ) {
    const filledDecks = runtime.authoritativeFilledDecks()
    if (!filledDecks) return false
    const captured = realDeckStringsFromFilledDecks(filledDecks, [
      prismsToDeckClass(metadata.match.player1.privateSeed.prisms),
      prismsToDeckClass(metadata.match.player2.privateSeed.prisms)
    ])
    if (metadata.realDeckStrings) {
      if (
        metadata.realDeckStrings[0] !== captured[0] ||
        metadata.realDeckStrings[1] !== captured[1]
      ) {
        throw new Error('authoritative match decks changed after capture')
      }
      return false
    }
    metadata.realDeckStrings = captured
    return true
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
          address: attachment.anonymousSpectator
            ? attachment.userId
            : `identity:${attachment.userId}`,
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

  private displaceOtherSockets(current: WebSocket, principal: string) {
    for (const previous of this.state.getWebSockets(principal)) {
      if (previous === current) continue
      this.safeSend(previous, {
        type: 'error',
        level: 'user',
        message: 'connected in another location'
      })
      previous.close(4001, 'Duplicate connection')
    }
  }

  private broadcast(message: GameServerMessage) {
    for (const socket of this.state.getWebSockets()) {
      const attachment =
        socket.deserializeAttachment() as SocketAttachment | null
      if (attachment?.joined) this.safeSend(socket, message)
    }
  }

  private finishMatchSockets(principal?: string) {
    const sockets = principal
      ? this.state.getWebSockets(principal)
      : this.state.getWebSockets()
    for (const socket of sockets) {
      const attachment =
        socket.deserializeAttachment() as SocketAttachment | null
      if (!attachment?.joined) continue
      this.safeSend(socket, { type: 'match_ended' })
      if ((attachment.role ?? 'player') === 'player') {
        socket.close(WEBSOCKET_FORCED_CLOSE_CODE)
      }
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
