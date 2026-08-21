import {
  ConquestMatchResult,
  ConquestStatus,
  DeckClass,
  GameMode,
  Hero,
  PlayerRank,
  type Conquest
} from '@opensky/proto'
import { CLOUDFLARE_MATCHMAKER_POOL_VERSION } from '@opensky/shared/cloudflare-multiplayer'

import {
  botMatchValidator,
  challengeCriteria,
  conquestCriteria,
  gameModeCriteriaValidator,
  practicePvpCriteria,
  rankedCriteria,
  type RelaxMatchingRuleIntervals,
  sameIpAddressValidator,
  sessionValidator,
  versionValidator,
  WaitTimeScoreCalculator
} from './criteria'
import { CaptchaGuard, readCaptchaConfig } from './captcha'
import {
  hasMinimumConquestRank,
  normalizePrivateSeedForIdentity,
  prismsFromPrivateSeed,
  validateGameModeDataConsistency,
  validateOwnedDeckForAdmission
} from './admission'
import { MatchProposal, processCombinations, combinePlayers } from './matcher'
import {
  findRunnerForMode,
  makeRunnerForMode,
  matchRunnerIncludesMode,
  matchRunnerIntervalMs,
  nextMatchRunnerDeadline,
  readMatchCadence,
  SOURCE_MATCH_RUNNERS,
  type MatchCadence,
  type MatchRunnerSpec
} from './match-cadence'
import {
  createBotForPlayer,
  createBotPlayer,
  createPlayer,
  createRegisteredBotForPlayer,
  isBot,
  isChallengeMatch,
  isConquestMatch,
  MatchmakerPlayer,
  prismsToDeckClass,
  RegisteredBotSelection,
  Rarity
} from './model'
import { PenaltyTracker, readPenaltyConfig } from './penalties'
import { orderParticipantsForGame } from './player-order'
import {
  errorMessage,
  FindMatchCommand,
  MatchmakerClientCommand,
  MatchmakerServerMessage,
  parseClientCommand,
  ProtocolError
} from './protocol'

const TICKET_PREFIX = 'ticket:'
const PROPOSAL_PREFIX = 'proposal:'
const PENDING_PREFIX = 'pending:'
const MATCH_RUNNER_PREFIX = 'match-runner:'
export const TRUSTED_PRINCIPAL_HEADER = 'x-cloud-weasel-principal'
export const TRUSTED_USER_ID_HEADER = 'x-cloud-weasel-user-id'
export const TRUSTED_DISPLAY_NAME_HEADER = 'x-cloud-weasel-display-name'
export const TRUSTED_CLIENT_IP_HEADER = 'x-cloud-weasel-client-ip'
export const INTERNAL_AUTH_HEADER = 'x-cloud-weasel-internal-auth'

export interface MatchmakerEnv {
  MATCHMAKER_POOLS: DurableObjectNamespace
  INTERNAL_AUTH_SECRET: string
  ALLOWED_ORIGINS?: string
  AUTHENTICATION_TIMEOUT_MS?: string
  MATCH_ACCEPTANCE_TIMEOUT_MS?: string
  MATCH_ACCEPTANCE_PENALTY_MS?: string
  MATCH_REFUSAL_WINDOW_MS?: string
  MATCH_REFUSAL_PENALTY_SECONDS?: string
  MATCH_INTERVAL_PRACTICE_BOT_MS?: string
  MATCH_INTERVAL_PRACTICE_PVP_MS?: string
  MATCH_INTERVAL_CONQUEST_CONSTRUCTED_MS?: string
  MATCH_INTERVAL_CHALLENGE_CONSTRUCTED_MS?: string
  MATCH_INTERVAL_CHALLENGE_DISCOVERY_MS?: string
  MATCH_INTERVAL_MAKE_MATCH_MS?: string
  MIN_RANK_TO_PLAY_CONQUEST?: string
  RELAX_MATCHING_INTERVAL_MS?: string
  RELAX_MATCHING_RANKED_CONSTRUCTED_INTERVAL_MS?: string
  RELAX_MATCHING_RANKED_DISCOVERY_INTERVAL_MS?: string
  RELAX_MATCHING_CONQUEST_CONSTRUCTED_INTERVAL_MS?: string
  RELAX_MATCHING_CONQUEST_DISCOVERY_INTERVAL_MS?: string
  MATCH_DISPATCH_MAX_ATTEMPTS?: string
  GAME_MODE_STATUS_CACHE_TTL_MS?: string
  EXPECTED_RELEASE_VERSION?: string
  ENABLE_RANKED_BOTS?: string
  ALLOW_SAME_IP_MATCH?: string
  STRICT_CONQUEST_MATCHING?: string
  HCAPTCHA_DISABLED?: string
  HCAPTCHA_SITE_KEY?: string
  HCAPTCHA_SECRET?: string
  HCAPTCHA_LOCAL?: string
  HCAPTCHA_VERIFY_URL?: string
  HCAPTCHA_HOST?: string
  MATCH_SERVICE?: Fetcher
}

interface SocketAttachment {
  principal: string
  userId: string
  displayName: string
  clientIp: string
  connectedAtMs: number
  lastMessageAtMs?: number
  subscribed: boolean
}

interface StoredPlayer extends Omit<MatchmakerPlayer, 'cards'> {
  cards: Array<[number, Rarity]>
}

interface StoredIdentity {
  principal: string
  userId: string
  displayName: string
}

interface StoredTicket {
  player: StoredPlayer
  request: FindMatchCommand
  identity: StoredIdentity
}

interface StoredParticipant {
  player: StoredPlayer
  request?: FindMatchCommand
  identity?: StoredIdentity
}

type StoredProposalStatus = 'FOUND' | 'ACCEPTED' | 'DISPATCHING' | 'ALLOCATED'

interface StoredProposal {
  id: string
  status: StoredProposalStatus
  participants: StoredParticipant[]
  accepted: string[]
  createdAtMs: number
  expiresAtMs: number
  botAcceptAtMs?: number
  dispatchAttempts: number
  nextDispatchAtMs?: number
  serverAddress?: string
}

interface StoredPendingProposal {
  proposalId: string
  expiresAtMs: number
}

interface StoredMatchRunner {
  nextAtMs: number
}

interface PendingProposalReference {
  proposalId: string
  // References from the previously deployed runtime stored only the proposal
  // ID. Keep those readable during the rolling upgrade and derive their
  // lifetime from the proposal when it still exists.
  expiresAtMs?: number
}

interface RuntimeConfig {
  authenticationTimeoutMs: number
  acceptanceTimeoutMs: number
  cadence: MatchCadence
  minRankToPlayConquest: PlayerRank
  relaxIntervals: RelaxMatchingRuleIntervals
  dispatchMaxAttempts: number
  gameModeStatusCacheTtlMs: number
  expectedReleaseVersion: string
  enableRankedBots: boolean
  allowSameIpMatch: boolean
  strictConquestMatching: boolean
}

interface MatchmakingProfile {
  gameModeEnabled: boolean
  score: number
  rank: PlayerRank
  rankedConstructedRank: PlayerRank
  rankedDiscoveryRank: PlayerRank
  lostLastMatch: boolean
  cards: Array<[number, Rarity]>
  recentMatches: Array<{ opponentId: string }>
  abandonPenaltyMs: number
  conquest?: Conquest
  activeMatch?: {
    mode: GameMode
    serverAddress: string
  }
}

const playerRanks = new Set(Object.values(PlayerRank))
const gameModes = new Set(Object.values(GameMode))
const deckClasses = new Set(Object.values(DeckClass))
const heroes = new Set(Object.values(Hero))
const conquestResults = new Set(Object.values(ConquestMatchResult))
const rarities = new Set<Rarity>(['base', 'silver', 'gold'])
const botPrisms = new Set(['str', 'hrt', 'agy', 'int', 'wis'])

// frontend/client_connection.go resets this hard-coded read deadline before
// every blocking websocket read. The preserved browser sends PING every three
// seconds; a suspended tab is silently disconnected after this exact window
// and reconnects when it becomes active again.
export const MATCHMAKER_READ_TIMEOUT_MS = 120_000

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const parsePositiveInteger = (
  value: string | undefined,
  fallback: number,
  maximum: number
) => {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 && parsed <= maximum
    ? parsed
    : fallback
}

const bool = (value: string | undefined, fallback: boolean) =>
  value === undefined ? fallback : value.toLowerCase() === 'true'

const sourcePlayerRanks = [
  PlayerRank.UNKNOWN,
  PlayerRank.UNRANKED,
  PlayerRank.WANDERER,
  PlayerRank.TRAINEE,
  PlayerRank.APPRENTICE,
  PlayerRank.EXPERT,
  PlayerRank.MASTER,
  PlayerRank.GRANDWEAVER
] as const

export const readMinimumConquestRank = (value: string | undefined) => {
  if (value === undefined) return PlayerRank.UNKNOWN
  if (!/^\d+$/.test(value)) {
    throw new Error('MIN_RANK_TO_PLAY_CONQUEST must be a source rank ordinal')
  }
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed >= sourcePlayerRanks.length) {
    throw new Error('MIN_RANK_TO_PLAY_CONQUEST must be a source rank ordinal')
  }
  return sourcePlayerRanks[parsed]
}

export const readRelaxMatchingRuleIntervals = (
  env: Pick<
    MatchmakerEnv,
    | 'RELAX_MATCHING_INTERVAL_MS'
    | 'RELAX_MATCHING_RANKED_CONSTRUCTED_INTERVAL_MS'
    | 'RELAX_MATCHING_RANKED_DISCOVERY_INTERVAL_MS'
    | 'RELAX_MATCHING_CONQUEST_CONSTRUCTED_INTERVAL_MS'
    | 'RELAX_MATCHING_CONQUEST_DISCOVERY_INTERVAL_MS'
  >
): RelaxMatchingRuleIntervals => {
  const relaxDefaultMs = parsePositiveInteger(
    env.RELAX_MATCHING_INTERVAL_MS,
    30_000,
    10 * 60_000
  )
  return {
    defaultMs: relaxDefaultMs,
    rankedConstructedMs: parsePositiveInteger(
      env.RELAX_MATCHING_RANKED_CONSTRUCTED_INTERVAL_MS,
      relaxDefaultMs,
      10 * 60_000
    ),
    rankedDiscoveryMs: parsePositiveInteger(
      env.RELAX_MATCHING_RANKED_DISCOVERY_INTERVAL_MS,
      relaxDefaultMs,
      10 * 60_000
    ),
    conquestConstructedMs: parsePositiveInteger(
      env.RELAX_MATCHING_CONQUEST_CONSTRUCTED_INTERVAL_MS,
      relaxDefaultMs,
      10 * 60_000
    ),
    conquestDiscoveryMs: parsePositiveInteger(
      env.RELAX_MATCHING_CONQUEST_DISCOVERY_INTERVAL_MS,
      relaxDefaultMs,
      10 * 60_000
    )
  }
}

const readConfig = (env: MatchmakerEnv): RuntimeConfig => {
  const expectedReleaseVersion =
    env.EXPECTED_RELEASE_VERSION?.trim().toLowerCase()
  if (
    !expectedReleaseVersion ||
    expectedReleaseVersion.length > 128 ||
    !/^[a-z0-9._-]+$/.test(expectedReleaseVersion)
  ) {
    throw new Error(
      'EXPECTED_RELEASE_VERSION must be a valid release identifier'
    )
  }
  return {
    authenticationTimeoutMs: parsePositiveInteger(
      env.AUTHENTICATION_TIMEOUT_MS,
      10_000,
      120_000
    ),
    acceptanceTimeoutMs: parsePositiveInteger(
      env.MATCH_ACCEPTANCE_TIMEOUT_MS,
      30_000,
      120_000
    ),
    cadence: readMatchCadence(env),
    minRankToPlayConquest: readMinimumConquestRank(
      env.MIN_RANK_TO_PLAY_CONQUEST
    ),
    relaxIntervals: readRelaxMatchingRuleIntervals(env),
    dispatchMaxAttempts: parsePositiveInteger(
      env.MATCH_DISPATCH_MAX_ATTEMPTS,
      3,
      10
    ),
    gameModeStatusCacheTtlMs: parsePositiveInteger(
      env.GAME_MODE_STATUS_CACHE_TTL_MS,
      10_000,
      5 * 60_000
    ),
    expectedReleaseVersion,
    enableRankedBots: bool(env.ENABLE_RANKED_BOTS, false),
    allowSameIpMatch: bool(env.ALLOW_SAME_IP_MATCH, false),
    strictConquestMatching: bool(env.STRICT_CONQUEST_MATCHING, false)
  }
}

const serializePlayer = (player: MatchmakerPlayer): StoredPlayer => ({
  ...player,
  cards: [...(player.cards ?? new Map()).entries()]
})

const deserializePlayer = (player: StoredPlayer): MatchmakerPlayer => ({
  ...player,
  cards: new Map(player.cards)
})

const ticketKey = (principal: string) => `${TICKET_PREFIX}${principal}`
const proposalKey = (proposalId: string) => `${PROPOSAL_PREFIX}${proposalId}`
const pendingKey = (principal: string) => `${PENDING_PREFIX}${principal}`
const matchRunnerKey = (runner: MatchRunnerSpec) =>
  `${MATCH_RUNNER_PREFIX}${runner.id}`

const participantFromTicket = (ticket: StoredTicket): StoredParticipant => ({
  player: ticket.player,
  request: ticket.request,
  identity: ticket.identity
})

const participantFromBot = (player: MatchmakerPlayer): StoredParticipant => ({
  player: serializePlayer(player)
})

const humanParticipants = (proposal: StoredProposal) =>
  proposal.participants.filter(
    participant => !isBot(deserializePlayer(participant.player))
  )

const DISPATCH_WATCHDOG_MS = 30_000

const gameModeStatusFields: Record<
  Exclude<GameMode, GameMode.UNKNOWN>,
  string
> = {
  [GameMode.TUTORIAL]: 'tutorial',
  [GameMode.PRACTICE_PVP]: 'practicePVP',
  [GameMode.PRACTICE_BOT]: 'practiceBot',
  [GameMode.WARM_UP]: 'warmUp',
  [GameMode.RANKED_CONSTRUCTED]: 'rankedConstructed',
  [GameMode.RANKED_DISCOVERY]: 'rankedDiscovery',
  [GameMode.CONQUEST_CONSTRUCTED]: 'conquestConstructed',
  [GameMode.CONQUEST_DISCOVERY]: 'conquestDiscovery',
  [GameMode.CHALLENGE_CONSTRUCTED]: 'challengeConstructed',
  [GameMode.CHALLENGE_DISCOVERY]: 'challengeDiscovery'
}

interface GameModeStatusCache {
  checkedAtMs: number
  enabledModes: Set<GameMode>
}

export class MatchmakerPool implements DurableObject {
  private readonly config: RuntimeConfig
  private readonly penalties: PenaltyTracker
  private readonly captcha: CaptchaGuard
  private gameModeStatusCache?: GameModeStatusCache

  constructor(
    private readonly state: DurableObjectState,
    private readonly env: MatchmakerEnv
  ) {
    this.config = readConfig(env)
    this.penalties = new PenaltyTracker(state.storage, readPenaltyConfig(env))
    this.captcha = new CaptchaGuard(state.storage, readCaptchaConfig(env))
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === '/internal/status') {
      if (
        request.headers.get(INTERNAL_AUTH_HEADER) !==
        this.env.INTERNAL_AUTH_SECRET
      ) {
        return Response.json({ error: 'not found' }, { status: 404 })
      }
      const [tickets, proposals] = await Promise.all([
        this.state.storage.list({ prefix: TICKET_PREFIX }),
        this.state.storage.list({ prefix: PROPOSAL_PREFIX })
      ])
      return Response.json({
        component: 'cloud-weasel-matchmaker-pool',
        poolVersion: CLOUDFLARE_MATCHMAKER_POOL_VERSION,
        queuedPlayers: tickets.size,
        activeProposals: proposals.size,
        connectedSockets: this.state.getWebSockets().length
      })
    }

    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 })
    }

    const attachment = this.attachmentFromRequest(request)
    if (!attachment)
      return new Response('Missing trusted identity', { status: 401 })

    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)
    server.serializeAttachment(attachment)
    this.state.acceptWebSocket(server, [attachment.principal])
    await this.scheduleAlarmAt(
      attachment.connectedAtMs + this.config.authenticationTimeoutMs
    )

    return new Response(null, { status: 101, webSocket: client })
  }

  async webSocketMessage(webSocket: WebSocket, raw: string | ArrayBuffer) {
    const attachment =
      webSocket.deserializeAttachment() as SocketAttachment | null
    if (!attachment) {
      this.safeSend(webSocket, errorMessage('INVALID_OPERATION'))
      webSocket.close(1008, 'Missing identity')
      return
    }

    // A successful Gorilla ReadMessage resets the source read deadline before
    // command decoding. Persist that moment in the hibernating attachment so
    // PING and every other received payload preserve the same idle lifetime.
    attachment.lastMessageAtMs = Date.now()
    webSocket.serializeAttachment(attachment)

    let command: MatchmakerClientCommand
    try {
      command = parseClientCommand(raw)
    } catch (error) {
      // Source message-receiver and command-decode failures are not exposed as
      // validation details. The websocket handler writes the exact generic
      // server error and then closes the client connection.
      this.failMalformedClientMessage(webSocket, error)
      return
    }

    try {
      switch (command.type) {
        case 'ping':
          // Source matcher heartbeats are one-way. Sending a new message type
          // would make the preserved browser client attempt to parse it.
          return
        case 'find_match':
          await this.findMatch(webSocket, attachment, command)
          return
        case 'accept_match':
          if (attachment.subscribed === false) {
            throw new Error('player channel is missing')
          }
          // The command's playerID is intentionally ignored. The authenticated
          // WebSocket principal is the sole authority for this transition.
          await this.acceptMatch(attachment.principal)
          return
        case 'decline_match':
          if (attachment.subscribed === false) {
            throw new Error('player channel is missing')
          }
          await this.declineMatch(attachment.principal)
          return
      }
    } catch (error) {
      // Source websocket_handler.go exposes only decline's invalid-operation
      // sentinel. Every find/accept failure and every other decline failure
      // escapes listenOnMessage, becomes the generic server error, and closes.
      if (
        command.type === 'decline_match' &&
        error instanceof ProtocolError &&
        error.reason === 'INVALID_OPERATION'
      ) {
        console.warn(
          'matchmaker protocol rejected',
          error.reason,
          error.message
        )
        this.safeSend(webSocket, errorMessage('INVALID_OPERATION'))
        return
      }
      console.error('matchmaker message failed', error)
      this.safeSend(webSocket, errorMessage('SERVER_ERROR'))
      webSocket.close()
    }
  }

  private failMalformedClientMessage(webSocket: WebSocket, error: unknown) {
    console.warn('matchmaker message rejected', error)
    this.safeSend(webSocket, errorMessage('SERVER_ERROR'))
    webSocket.close()
  }

  async webSocketClose(webSocket: WebSocket) {
    await this.cleanupSocket(webSocket)
  }

  async webSocketError(webSocket: WebSocket) {
    await this.cleanupSocket(webSocket)
  }

  async alarm() {
    const now = Date.now()
    this.expireUnauthenticatedSockets(now)
    this.expireIdleSockets(now)
    await this.processProposalTimers(now)
    await this.syncMatchRunnerStates(now)
    await this.processDueMatchRunners(now)
    await this.rescheduleAlarm(now)
  }

  private attachmentFromRequest(request: Request): SocketAttachment | null {
    const principal = request.headers.get(TRUSTED_PRINCIPAL_HEADER)
    const userId = request.headers.get(TRUSTED_USER_ID_HEADER)
    if (!principal || !/^0x[0-9a-f]{40}$/.test(principal) || !userId)
      return null
    return {
      principal,
      userId: userId.slice(0, 256),
      displayName: (
        request.headers.get(TRUSTED_DISPLAY_NAME_HEADER) ?? ''
      ).slice(0, 256),
      clientIp: (request.headers.get(TRUSTED_CLIENT_IP_HEADER) ?? '').slice(
        0,
        128
      ),
      connectedAtMs: Date.now(),
      lastMessageAtMs: Date.now(),
      subscribed: false
    }
  }

  private async findMatch(
    webSocket: WebSocket,
    attachment: SocketAttachment,
    rawCommand: FindMatchCommand
  ) {
    // Source frontend/findmatch/handler.go treats an established player
    // channel as authoritative and ignores repeated find_match commands.
    if (attachment.subscribed) return

    let command = rawCommand
    // Source oracle: frontend/findmatch/validators/version.go rejects a stale
    // release before authentication, captcha, profile hydration, or queueing.
    if (command.versionHash !== this.config.expectedReleaseVersion) {
      throw new ProtocolError('OUTDATED_CLIENT', 'OUTDATED_CLIENT')
    }

    // Source oracle: frontend/findmatch/validators/ip_address.go runs directly
    // after version validation. When same-IP matching is disabled, an empty
    // address is a silent validation miss: do not hydrate, queue, or establish
    // the player channel, and let the normal authentication deadline remain.
    if (!this.config.allowSameIpMatch && attachment.clientIp.length === 0)
      return

    command = normalizePrivateSeedForIdentity(command, attachment.principal)
    validateGameModeDataConsistency(command)

    let captchaValid: boolean
    try {
      captchaValid = await this.captcha.validate(
        {
          address: attachment.principal,
          ipAddress: attachment.clientIp
        },
        command.verifyToken
      )
    } catch (error) {
      console.error('matchmaker captcha configuration failed', error)
      throw new ProtocolError('SERVER_ERROR', 'captcha is unavailable')
    }
    if (!captchaValid) return
    if (!(await this.captcha.canMatch(attachment.principal))) return

    const profile = await this.loadPlayerProfile(
      attachment,
      command.mode,
      command.versionHash
    )
    const prisms = prismsFromPrivateSeed(command.privateSeed)
    if (
      command.mode === GameMode.CONQUEST_CONSTRUCTED ||
      command.mode === GameMode.CONQUEST_DISCOVERY
    ) {
      if (
        !hasMinimumConquestRank(
          profile.rankedConstructedRank,
          profile.rankedDiscoveryRank,
          this.config.minRankToPlayConquest
        )
      ) {
        throw new ProtocolError('INVALID_ACCOUNT', 'rank is too low')
      }
      if (!profile.conquest) {
        throw new ProtocolError('INVALID_ACCOUNT', 'conquest info is missing')
      }
      if (profile.conquest.mode !== command.mode) {
        throw new ProtocolError(
          'INVALID_ACCOUNT',
          'active conquest does not match the game mode'
        )
      }
      if (profile.conquest.deckClass !== prismsToDeckClass(prisms)) {
        throw new ProtocolError(
          'CONQUEST_DECK_CLASS_MISMATCH',
          'deck class does not match the active conquest'
        )
      }
    }

    command = validateOwnedDeckForAdmission(
      command,
      profile.cards.map(([card]) => card)
    )
    if (!profile.gameModeEnabled) {
      throw new ProtocolError('GAME_MODE_DISABLED', 'GAME_MODE_DISABLED')
    }
    if (profile.activeMatch) {
      this.safeSend(webSocket, {
        type: 'match_made',
        serverAddress: profile.activeMatch.serverAddress
      })
      this.safeSend(webSocket, {
        type: 'match_ready_to_start',
        mode: profile.activeMatch.mode
      })
      return
    }

    // The source pending-match validator runs before the penalty validator and
    // before duplicate notification. A second, not-yet-subscribed socket must
    // therefore fail without disturbing or replaying another live channel.
    const pendingProposal = await this.pendingProposalReference(
      attachment.principal
    )
    if (pendingProposal) {
      const now = Date.now()
      const proposal = await this.state.storage.get<StoredProposal>(
        proposalKey(pendingProposal.proposalId)
      )
      const pendingExpiresAtMs =
        pendingProposal.expiresAtMs ?? proposal?.expiresAtMs
      if (pendingExpiresAtMs !== undefined && pendingExpiresAtMs >= now) {
        throw new ProtocolError('SERVER_ERROR', 'pending match already exists')
      }
      // Redis removes the source TTL key independently of the longer-lived
      // proposal row. Durable Object storage has no per-key TTL, so remove the
      // expired reference lazily before allowing the new search.
      await this.state.storage.delete(pendingKey(attachment.principal))
      if (proposal?.status === 'FOUND' && proposal.expiresAtMs <= now) {
        await this.expireProposal(proposal)
      }
    }

    const penaltyMs = Math.max(
      profile.abandonPenaltyMs,
      await this.penalties.getPenaltyMs({
        address: attachment.principal,
        mode: command.mode
      })
    )
    if (penaltyMs > 0) {
      this.safeSend(webSocket, {
        type: 'match_refusal_cooldown',
        durationSeconds: Math.floor(penaltyMs / 1_000)
      })
      return
    }

    const player = createPlayer({
      address: attachment.principal,
      mode: command.mode,
      prisms,
      sessionId: command.sessionID,
      playerSessionId: command.playerSessionID,
      clientVersionHash: command.versionHash,
      ipAddress: attachment.clientIp,
      initTimestampMs: Date.now(),
      score: profile.score,
      rank: profile.rank,
      lostLastMatch: profile.lostLastMatch,
      cards: new Map(profile.cards),
      conquestProgress: profile.conquest
        ? Object.values(profile.conquest.matchProgress)
        : [],
      recentMatches: profile.recentMatches
    })
    const ticket: StoredTicket = {
      player: serializePlayer(player),
      request: command,
      identity: {
        principal: attachment.principal,
        userId: attachment.userId,
        displayName: attachment.displayName
      }
    }
    // Source order: notify existing subscribers only after every validator
    // succeeds, then create the new player channel and queue entry. Publishing
    // the duplicate notice does not close or unsubscribe the earlier channel;
    // the preserved browser client closes itself with its forced-close code.
    this.notifyDuplicateSubscribers(webSocket, attachment.principal)
    attachment.subscribed = true
    webSocket.serializeAttachment(attachment)
    await this.putTicketAndArmFindRunner(ticket, Date.now())
    console.log('matchmaker ticket accepted', command.mode)
    await this.rescheduleAlarm(Date.now())
  }

  private async loadPlayerProfile(
    attachment: SocketAttachment,
    mode: GameMode,
    versionHash: string
  ): Promise<MatchmakingProfile> {
    if (!this.env.MATCH_SERVICE) {
      throw new ProtocolError('SERVER_ERROR', 'match service is unavailable')
    }
    let response: Response
    try {
      response = await this.env.MATCH_SERVICE.fetch(
        new Request(
          'https://cloud-weasel-match/internal/matchmaker/player-profile',
          {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              [INTERNAL_AUTH_HEADER]: this.env.INTERNAL_AUTH_SECRET
            },
            body: JSON.stringify({
              userId: attachment.userId,
              principal: attachment.principal,
              mode,
              versionHash
            })
          }
        )
      )
    } catch {
      throw new ProtocolError('SERVER_ERROR', 'matchmaking profile failed')
    }
    if (response.status === 404) {
      throw new ProtocolError('INVALID_ACCOUNT', 'player account was not found')
    }
    if (response.status === 403) {
      throw new ProtocolError('INVALID_ACCOUNT', 'account banned')
    }
    if (!response.ok) {
      throw new ProtocolError('SERVER_ERROR', 'matchmaking profile failed')
    }

    let body: unknown
    try {
      body = await response.json()
    } catch {
      throw new ProtocolError('SERVER_ERROR', 'invalid matchmaking profile')
    }
    if (!isRecord(body) || typeof body.gameModeEnabled !== 'boolean') {
      throw new ProtocolError('SERVER_ERROR', 'invalid matchmaking profile')
    }
    const profile = body.profile
    if (
      !isRecord(profile) ||
      !Number.isSafeInteger(profile.score) ||
      Math.abs(profile.score as number) > 2_147_483_647 ||
      !playerRanks.has(profile.rank as PlayerRank) ||
      !playerRanks.has(profile.rankedConstructedRank as PlayerRank) ||
      !playerRanks.has(profile.rankedDiscoveryRank as PlayerRank) ||
      typeof profile.lostLastMatch !== 'boolean' ||
      !Number.isSafeInteger(profile.abandonPenaltyMs) ||
      (profile.abandonPenaltyMs as number) < 0 ||
      (profile.abandonPenaltyMs as number) > 30 * 24 * 60 * 60_000 ||
      !Array.isArray(profile.cards) ||
      profile.cards.length > 5_000 ||
      !Array.isArray(profile.recentMatches) ||
      profile.recentMatches.length > 20
    ) {
      throw new ProtocolError('SERVER_ERROR', 'invalid matchmaking profile')
    }

    const cards = profile.cards.map(entry => {
      if (
        !Array.isArray(entry) ||
        entry.length !== 2 ||
        !Number.isSafeInteger(entry[0]) ||
        (entry[0] as number) < 0 ||
        !rarities.has(entry[1] as Rarity)
      ) {
        throw new ProtocolError('SERVER_ERROR', 'invalid matchmaking cards')
      }
      return [entry[0] as number, entry[1] as Rarity] as [number, Rarity]
    })
    const recentMatches = profile.recentMatches.map(recent => {
      if (
        !isRecord(recent) ||
        typeof recent.opponentId !== 'string' ||
        !/^0x[0-9a-f]{40}$/.test(recent.opponentId)
      ) {
        throw new ProtocolError('SERVER_ERROR', 'invalid matchmaking history')
      }
      return { opponentId: recent.opponentId }
    })

    let activeMatch: MatchmakingProfile['activeMatch']
    if (profile.activeMatch !== undefined) {
      if (
        !isRecord(profile.activeMatch) ||
        !gameModes.has(profile.activeMatch.mode as GameMode) ||
        typeof profile.activeMatch.serverAddress !== 'string' ||
        !/^wss?:\/\//.test(profile.activeMatch.serverAddress)
      ) {
        throw new ProtocolError('SERVER_ERROR', 'invalid active match')
      }
      activeMatch = {
        mode: profile.activeMatch.mode as GameMode,
        serverAddress: profile.activeMatch.serverAddress
      }
    }

    let conquest: Conquest | undefined
    if (profile.conquest !== undefined) {
      if (
        !isRecord(profile.conquest) ||
        !Number.isSafeInteger(profile.conquest.id) ||
        (profile.conquest.id as number) <= 0 ||
        profile.conquest.status !== ConquestStatus.IN_PROGRESS ||
        ![GameMode.CONQUEST_CONSTRUCTED, GameMode.CONQUEST_DISCOVERY].includes(
          profile.conquest.mode as GameMode
        ) ||
        !Number.isSafeInteger(profile.conquest.nonce) ||
        (profile.conquest.nonce as number) <= 0 ||
        !heroes.has(profile.conquest.hero as Hero) ||
        profile.conquest.hero === Hero.UNKNOWN ||
        !deckClasses.has(profile.conquest.deckClass as DeckClass) ||
        profile.conquest.deckClass === DeckClass.UNKNOWN_CLASS ||
        !isRecord(profile.conquest.matchProgress) ||
        Object.keys(profile.conquest.matchProgress).length > 1_000 ||
        Object.keys(profile.conquest.matchProgress).some(
          key => !/^\d+$/.test(key)
        ) ||
        Object.values(profile.conquest.matchProgress).some(
          result =>
            !conquestResults.has(result as ConquestMatchResult) ||
            result === ConquestMatchResult.UNKNOWN
        )
      ) {
        throw new ProtocolError('SERVER_ERROR', 'invalid conquest profile')
      }
      conquest = profile.conquest as unknown as Conquest
    }

    return {
      gameModeEnabled: body.gameModeEnabled,
      score: profile.score as number,
      rank: profile.rank as PlayerRank,
      rankedConstructedRank: profile.rankedConstructedRank as PlayerRank,
      rankedDiscoveryRank: profile.rankedDiscoveryRank as PlayerRank,
      lostLastMatch: profile.lostLastMatch,
      cards,
      recentMatches,
      abandonPenaltyMs: profile.abandonPenaltyMs as number,
      ...(conquest ? { conquest } : {}),
      ...(activeMatch ? { activeMatch } : {})
    }
  }

  private async loadRegisteredBot(
    player: MatchmakerPlayer,
    byAddress: Map<string, StoredTicket>
  ) {
    if (!this.env.MATCH_SERVICE || !this.config.enableRankedBots) {
      throw new Error('registered bots are disabled')
    }
    const ticket = byAddress.get(player.address)
    if (!ticket) throw new Error('registered bot opponent ticket is missing')
    let response: Response
    try {
      response = await this.env.MATCH_SERVICE.fetch(
        new Request(
          'https://cloud-weasel-match/internal/matchmaker/registered-bot',
          {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              [INTERNAL_AUTH_HEADER]: this.env.INTERNAL_AUTH_SECRET
            },
            body: JSON.stringify({
              userId: ticket.identity.userId,
              principal: player.address,
              mode: player.mode,
              score: player.score,
              rank: player.rank
            })
          }
        )
      )
    } catch {
      throw new Error('registered bot selection failed')
    }
    let body: unknown
    try {
      body = await response.json()
    } catch {
      throw new Error('registered bot selection returned invalid JSON')
    }
    if (!response.ok || !isRecord(body) || !isRecord(body.bot)) {
      throw new Error('registered bot selection failed')
    }
    const bot = body.bot
    if (
      typeof bot.userId !== 'string' ||
      !/^system:bot:[0-9]{4}$/.test(bot.userId) ||
      typeof bot.principal !== 'string' ||
      !/^0x[0-9a-f]{40}$/.test(bot.principal) ||
      typeof bot.name !== 'string' ||
      bot.name.length < 1 ||
      bot.name.length > 64 ||
      !Number.isSafeInteger(bot.score) ||
      Math.abs(bot.score as number) > 2_147_483_647 ||
      !playerRanks.has(bot.rank as PlayerRank) ||
      !deckClasses.has(bot.deckClass as DeckClass) ||
      bot.deckClass === DeckClass.UNKNOWN_CLASS ||
      typeof bot.prism !== 'string' ||
      !botPrisms.has(bot.prism) ||
      typeof bot.deckString !== 'string' ||
      bot.deckString.length < 8 ||
      bot.deckString.length > 2_048 ||
      !Array.isArray(bot.cardIds) ||
      ![0, 30].includes(bot.cardIds.length) ||
      bot.cardIds.some(
        card => !Number.isSafeInteger(card) || (card as number) <= 0
      )
    ) {
      throw new Error('registered bot selection is invalid')
    }
    return createRegisteredBotForPlayer(
      player,
      bot as unknown as RegisteredBotSelection
    )
  }

  private async acceptMatch(principal: string) {
    const pendingProposal = await this.pendingProposalReference(principal)
    if (!pendingProposal) {
      throw new ProtocolError('INVALID_OPERATION', 'match proposal is not set')
    }
    const proposal = await this.state.storage.get<StoredProposal>(
      proposalKey(pendingProposal.proposalId)
    )
    if (!proposal || proposal.expiresAtMs < Date.now()) {
      // Source FrontendService.AcceptMatch notifies only the accepting
      // player's channel, then returns ErrInvalidOperation. The normal timeout
      // runner remains authoritative for deleting and notifying the proposal
      // as a whole.
      this.sendToPrincipal(principal, { type: 'timed_out' })
      throw new ProtocolError('INVALID_OPERATION', 'match proposal timed out')
    }
    if (proposal.accepted.includes(principal)) return
    if (proposal.status !== 'FOUND') {
      throw new ProtocolError(
        'INVALID_OPERATION',
        'match proposal is not accepting responses'
      )
    }
    await this.recordAcceptance(proposal, principal)
    await this.rescheduleAlarm(Date.now())
  }

  private async recordAcceptance(proposal: StoredProposal, principal: string) {
    const addresses = proposal.participants.map(
      participant => participant.player.address
    )
    if (!addresses.includes(principal)) {
      this.sendToPrincipal(principal, errorMessage('INVALID_OPERATION'))
      return
    }
    if (!proposal.accepted.includes(principal)) {
      proposal.accepted.push(principal)
      await this.state.storage.put(proposalKey(proposal.id), proposal)
      this.broadcastProposal(proposal, {
        type: 'accept_match',
        playerID: principal
      })
    }

    if (addresses.every(address => proposal.accepted.includes(address))) {
      await this.beginAcceptedDispatch(proposal)
    }
  }

  private async beginAcceptedDispatch(proposal: StoredProposal) {
    if (proposal.status !== 'FOUND') return
    proposal.participants = await orderParticipantsForGame(
      proposal.id,
      proposal.participants as [StoredParticipant, StoredParticipant]
    )
    proposal.status = 'ACCEPTED'
    proposal.nextDispatchAtMs = undefined
    if (
      proposal.participants.some(participant =>
        [GameMode.PRACTICE_BOT, GameMode.WARM_UP].includes(
          participant.player.mode
        )
      )
    ) {
      // Rolling-upgrade compatibility for proposals created by the previous
      // Worker. The source BotMatchProcessor allocates on the find tick and
      // never enters a MakeMatch queue, so finish this legacy state directly.
      await this.state.storage.put(proposalKey(proposal.id), proposal)
      await this.dispatchProposal(proposal)
      return
    }
    await this.putProposalAndArmMakeRunner(proposal, Date.now())
  }

  private async declineMatch(principal: string) {
    // Source Decliner always removes the player from the queue first, then
    // relies on the independently expiring pending-match reference. It does
    // not restrict decline to FOUND proposals: ACCEPTED and TO_BE_MADE remain
    // declinable while that reference is live.
    await this.state.storage.delete(ticketKey(principal))
    try {
      const proposal = await this.proposalForPrincipal(principal)
      if (!proposal || proposal.expiresAtMs < Date.now()) return
      const player = proposal.participants.find(
        participant => participant.player.address === principal
      )
      if (player && isConquestMatch(deserializePlayer(player.player))) {
        throw new ProtocolError(
          'INVALID_OPERATION',
          'conquest cannot be declined'
        )
      }
      this.broadcastProposal(proposal, {
        type: 'decline_match',
        playerID: principal
      })
      await this.deleteProposal(proposal)
      if (player && !isChallengeMatch(deserializePlayer(player.player))) {
        await this.penalties.setRefusalPenalty(deserializePlayer(player.player))
      }
    } finally {
      await this.rescheduleAlarm(Date.now())
    }
  }

  private async attemptFindRunner(runner: MatchRunnerSpec, now: number) {
    if (runner.phase !== 'find') return
    const enabledModes = await this.currentEnabledGameModes(now)
    if (!enabledModes) return
    await this.drainDisabledMatchmaking(enabledModes)

    const storedTickets = await this.state.storage.list<StoredTicket>({
      prefix: TICKET_PREFIX
    })
    const tickets: StoredTicket[] = []
    const orphanedTicketKeys: string[] = []
    for (const [key, ticket] of storedTickets) {
      if (!matchRunnerIncludesMode(runner, ticket.player.mode)) continue
      if (this.hasSubscribedSocket(ticket.player.address)) {
        tickets.push(ticket)
      } else {
        // Source QueryService repairs queue/subscription inconsistencies before
        // returning matching candidates. Filtering alone would leave a
        // durable ticket and alarm behind forever.
        orphanedTicketKeys.push(key)
      }
    }
    if (orphanedTicketKeys.length > 0) {
      await this.state.storage.delete(orphanedTicketKeys)
      console.warn(
        'matchmaker removed orphaned queue tickets',
        orphanedTicketKeys.length
      )
    }
    const byAddress = new Map(
      tickets.map(ticket => [ticket.player.address, ticket])
    )

    if (runner.id === 'find-practice-bot') {
      for (const ticket of tickets) {
        if (!(await this.state.storage.get(ticketKey(ticket.player.address))))
          continue
        const human = deserializePlayer(ticket.player)
        await this.createBotMatch(
          human,
          createBotForPlayer(human),
          byAddress,
          now
        )
      }
      return
    }

    for (const modes of runner.groups) {
      const candidates = [...byAddress.values()]
        .filter(ticket => modes.includes(ticket.player.mode))
        .filter(ticket => storedTickets.has(ticketKey(ticket.player.address)))
        .map(ticket => deserializePlayer(ticket.player))
      await this.matchGroup(candidates, byAddress, now, [...modes])
    }
  }

  private async attemptMakeRunner(runner: MatchRunnerSpec) {
    if (runner.phase !== 'make') return
    const proposals = await this.state.storage.list<StoredProposal>({
      prefix: PROPOSAL_PREFIX
    })
    for (const proposal of proposals.values()) {
      if (
        proposal.status !== 'ACCEPTED' ||
        proposal.nextDispatchAtMs !== undefined ||
        !proposal.participants.some(participant =>
          matchRunnerIncludesMode(runner, participant.player.mode)
        )
      ) {
        continue
      }
      await this.dispatchProposal(proposal)
    }
  }

  private async putTicketAndArmFindRunner(ticket: StoredTicket, now: number) {
    const runner = findRunnerForMode(ticket.player.mode)
    await this.state.storage.transaction(async transaction => {
      await transaction.put(ticketKey(ticket.player.address), ticket)
      if (!runner) return
      const key = matchRunnerKey(runner)
      const currentRunner = await transaction.get<StoredMatchRunner>(key)
      const nextAtMs =
        currentRunner?.nextAtMs ??
        now + matchRunnerIntervalMs(runner, this.config.cadence)
      if (!currentRunner) await transaction.put(key, { nextAtMs })
      const currentAlarm = await transaction.getAlarm()
      if (currentAlarm === null || nextAtMs < currentAlarm) {
        await transaction.setAlarm(nextAtMs)
      }
    })
  }

  private async putProposalAndArmMakeRunner(
    proposal: StoredProposal,
    now: number
  ) {
    const runner = proposal.participants
      .map(participant => makeRunnerForMode(participant.player.mode))
      .find(
        (candidate): candidate is MatchRunnerSpec => candidate !== undefined
      )
    await this.state.storage.transaction(async transaction => {
      await transaction.put(proposalKey(proposal.id), proposal)
      if (!runner) return
      const key = matchRunnerKey(runner)
      const currentRunner = await transaction.get<StoredMatchRunner>(key)
      const nextAtMs =
        currentRunner?.nextAtMs ??
        now + matchRunnerIntervalMs(runner, this.config.cadence)
      if (!currentRunner) await transaction.put(key, { nextAtMs })
      const currentAlarm = await transaction.getAlarm()
      if (currentAlarm === null || nextAtMs < currentAlarm) {
        await transaction.setAlarm(nextAtMs)
      }
    })
  }

  private async syncMatchRunnerStates(now: number) {
    const [tickets, proposals, storedRunners] = await Promise.all([
      this.state.storage.list<StoredTicket>({ prefix: TICKET_PREFIX }),
      this.state.storage.list<StoredProposal>({ prefix: PROPOSAL_PREFIX }),
      this.state.storage.list<StoredMatchRunner>({
        prefix: MATCH_RUNNER_PREFIX
      })
    ])
    const activeRunnerIds = new Set<string>()
    for (const ticket of tickets.values()) {
      const runner = findRunnerForMode(ticket.player.mode)
      if (runner) activeRunnerIds.add(runner.id)
    }
    for (const proposal of proposals.values()) {
      if (
        proposal.status !== 'ACCEPTED' ||
        proposal.nextDispatchAtMs !== undefined
      ) {
        continue
      }
      for (const participant of proposal.participants) {
        const runner = makeRunnerForMode(participant.player.mode)
        if (runner) {
          activeRunnerIds.add(runner.id)
          break
        }
      }
    }

    const writes: Record<string, StoredMatchRunner> = {}
    const deletes: string[] = []
    for (const runner of SOURCE_MATCH_RUNNERS) {
      const key = matchRunnerKey(runner)
      if (!activeRunnerIds.has(runner.id)) {
        if (storedRunners.has(key)) deletes.push(key)
        continue
      }
      if (!storedRunners.has(key)) {
        writes[key] = {
          nextAtMs: now + matchRunnerIntervalMs(runner, this.config.cadence)
        }
      }
    }
    if (Object.keys(writes).length > 0) await this.state.storage.put(writes)
    if (deletes.length > 0) await this.state.storage.delete(deletes)
  }

  private async processDueMatchRunners(now: number) {
    const storedRunners = await this.state.storage.list<StoredMatchRunner>({
      prefix: MATCH_RUNNER_PREFIX
    })
    for (const runner of SOURCE_MATCH_RUNNERS) {
      const key = matchRunnerKey(runner)
      const stored = storedRunners.get(key)
      if (!stored || stored.nextAtMs > now) continue
      if (runner.phase === 'find') {
        await this.attemptFindRunner(runner, now)
      } else {
        await this.attemptMakeRunner(runner)
      }
      await this.advanceOrDeleteMatchRunner(runner, stored.nextAtMs, now)
    }
  }

  private async advanceOrDeleteMatchRunner(
    runner: MatchRunnerSpec,
    previousDeadline: number,
    now: number
  ) {
    let hasWork = false
    if (runner.phase === 'find') {
      const tickets = await this.state.storage.list<StoredTicket>({
        prefix: TICKET_PREFIX
      })
      hasWork = [...tickets.values()].some(ticket =>
        matchRunnerIncludesMode(runner, ticket.player.mode)
      )
    } else {
      const proposals = await this.state.storage.list<StoredProposal>({
        prefix: PROPOSAL_PREFIX
      })
      hasWork = [...proposals.values()].some(
        proposal =>
          proposal.status === 'ACCEPTED' &&
          proposal.nextDispatchAtMs === undefined &&
          proposal.participants.some(participant =>
            matchRunnerIncludesMode(runner, participant.player.mode)
          )
      )
    }
    if (!hasWork) {
      await this.state.storage.delete(matchRunnerKey(runner))
      return
    }
    await this.state.storage.put(matchRunnerKey(runner), {
      nextAtMs: nextMatchRunnerDeadline(
        previousDeadline,
        matchRunnerIntervalMs(runner, this.config.cadence),
        now
      )
    } satisfies StoredMatchRunner)
  }

  private async matchGroup(
    players: MatchmakerPlayer[],
    byAddress: Map<string, StoredTicket>,
    now: number,
    modes: GameMode[]
  ) {
    if (players.length === 0) return
    const rankedGroup = modes.some(
      mode =>
        mode === GameMode.RANKED_CONSTRUCTED ||
        mode === GameMode.RANKED_DISCOVERY
    )
    const candidates = [...players]
    if (rankedGroup && this.config.enableRankedBots) {
      candidates.push(createBotPlayer(modes[0]))
    }
    if (candidates.length < 2) return

    const interval = this.config.relaxIntervals
    const pvpScore = new WaitTimeScoreCalculator(
      interval,
      [100, 200, 300, 400],
      () => now
    )
    const conquestWins = new WaitTimeScoreCalculator(
      interval,
      [0, 1, 2],
      () => now
    )
    const conquestElo = new WaitTimeScoreCalculator(
      interval,
      [2, 5, 9, 14, Number.MAX_SAFE_INTEGER],
      () => now
    )
    const combinations = combinePlayers(
      candidates,
      botMatchValidator(false, () => now),
      [
        versionValidator,
        sessionValidator,
        sameIpAddressValidator(this.config.allowSameIpMatch),
        gameModeCriteriaValidator(
          challengeCriteria,
          practicePvpCriteria(pvpScore),
          conquestCriteria(
            this.config.strictConquestMatching,
            conquestWins,
            conquestElo
          ),
          rankedCriteria(pvpScore)
        )
      ],
      () => now
    )
    const proposals = await processCombinations(combinations, {
      createRegistered: player => this.loadRegisteredBot(player, byAddress)
    })
    for (const proposal of proposals) {
      await this.createProposal(proposal.players, byAddress, now)
    }
  }

  private async createProposal(
    players: MatchmakerPlayer[],
    byAddress: Map<string, StoredTicket>,
    now: number
  ) {
    const humanAddresses = players
      .filter(player => !isBot(player))
      .map(p => p.address)
    if (humanAddresses.some(address => !byAddress.has(address))) return
    for (const address of humanAddresses) {
      if (!(await this.state.storage.get(ticketKey(address)))) return
    }

    const matchProposal = new MatchProposal(crypto.randomUUID(), players)
    const proposal: StoredProposal = {
      id: matchProposal.id,
      status: 'FOUND',
      participants: players.map(player => {
        const ticket = byAddress.get(player.address)
        return ticket
          ? participantFromTicket(ticket)
          : participantFromBot(player)
      }),
      accepted: [],
      createdAtMs: now,
      expiresAtMs: now + this.config.acceptanceTimeoutMs,
      botAcceptAtMs: players.some(isBot) ? now + 1_000 : undefined,
      dispatchAttempts: 0
    }

    const writes: Record<string, unknown> = {
      [proposalKey(proposal.id)]: proposal
    }
    for (const principal of humanAddresses) {
      writes[pendingKey(principal)] = {
        proposalId: proposal.id,
        expiresAtMs: proposal.expiresAtMs
      } satisfies StoredPendingProposal
    }
    await this.state.storage.put(writes)
    await this.state.storage.delete(humanAddresses.map(ticketKey))
    console.log(
      'matchmaker proposal created',
      proposal.id,
      humanAddresses.length,
      players.some(isBot)
    )

    for (const principal of humanAddresses) {
      const participant = proposal.participants.find(
        current => current.player.address === principal
      )
      if (!participant) continue
      this.sendToPrincipal(principal, {
        type: 'match_found',
        mode: participant.player.mode,
        timeoutMs: this.config.acceptanceTimeoutMs,
        playerIDs: proposal.participants.map(current => current.player.address)
      })
    }
  }

  private async createBotMatch(
    human: MatchmakerPlayer,
    bot: MatchmakerPlayer,
    byAddress: Map<string, StoredTicket>,
    now: number
  ) {
    const ticket = byAddress.get(human.address)
    if (!ticket || !(await this.state.storage.get(ticketKey(human.address)))) {
      return
    }
    const id = crypto.randomUUID()
    const participants = await orderParticipantsForGame(id, [
      participantFromTicket(ticket),
      participantFromBot(bot)
    ])
    const proposal: StoredProposal = {
      id,
      status: 'ACCEPTED',
      participants,
      accepted: [human.address, bot.address],
      createdAtMs: now,
      expiresAtMs: now + this.config.acceptanceTimeoutMs,
      dispatchAttempts: 0
    }
    await this.state.storage.transaction(async transaction => {
      await transaction.put(proposalKey(id), proposal)
      await transaction.delete(ticketKey(human.address))
    })
    console.log('matchmaker bot match ready', id, human.mode)
    await this.dispatchProposal(proposal)
  }

  private async processProposalTimers(now: number) {
    const stored = await this.state.storage.list<StoredProposal>({
      prefix: PROPOSAL_PREFIX
    })
    for (const proposal of stored.values()) {
      if (
        proposal.status === 'FOUND' &&
        proposal.participants.every(participant =>
          proposal.accepted.includes(participant.player.address)
        )
      ) {
        await this.beginAcceptedDispatch(proposal)
        continue
      }
      if (
        proposal.status === 'FOUND' &&
        proposal.botAcceptAtMs !== undefined &&
        proposal.botAcceptAtMs <= now
      ) {
        const bot = proposal.participants.find(participant =>
          isBot(deserializePlayer(participant.player))
        )
        if (bot && !proposal.accepted.includes(bot.player.address)) {
          await this.recordAcceptance(proposal, bot.player.address)
        }
      }
      if (proposal.status === 'FOUND' && proposal.expiresAtMs <= now) {
        await this.expireProposal(proposal)
      } else if (
        proposal.status !== 'FOUND' &&
        (proposal.nextDispatchAtMs === undefined
          ? proposal.status !== 'ACCEPTED'
          : proposal.nextDispatchAtMs <= now)
      ) {
        await this.dispatchProposal(proposal)
      }
    }
  }

  private async expireProposal(proposal: StoredProposal) {
    if (proposal.status !== 'FOUND') return
    const match = new MatchProposal(
      proposal.id,
      proposal.participants.map(participant =>
        deserializePlayer(participant.player)
      )
    )
    if (match.isConquest()) {
      for (const participant of proposal.participants) {
        if (!proposal.accepted.includes(participant.player.address)) {
          await this.recordAcceptance(proposal, participant.player.address)
        }
      }
      return
    }
    this.broadcastProposal(proposal, { type: 'timed_out' })
    for (const participant of humanParticipants(proposal)) {
      const player = deserializePlayer(participant.player)
      if (
        !proposal.accepted.includes(player.address) &&
        !isChallengeMatch(player)
      ) {
        await this.penalties.setAcceptTimeoutPenalty(player)
      }
    }
    await this.deleteProposal(proposal)
  }

  private async dispatchProposal(proposal: StoredProposal) {
    if (!this.env.MATCH_SERVICE) return
    if (proposal.status === 'ALLOCATED' && proposal.serverAddress) {
      await this.completeAllocatedProposal(proposal)
      return
    }
    if (proposal.status === 'ACCEPTED') {
      const enabledModes = await this.currentEnabledGameModes(Date.now())
      if (!enabledModes) {
        return
      }
      if (this.proposalUsesDisabledMode(proposal, enabledModes)) {
        await this.drainAcceptedProposal(proposal)
        return
      }
    }
    proposal.status = 'DISPATCHING'
    proposal.dispatchAttempts += 1
    proposal.nextDispatchAtMs = Date.now() + DISPATCH_WATCHDOG_MS
    await this.persistProposalWithAlarm(proposal)

    let allocationConfirmed = false
    try {
      if (
        !proposal.participants.some(participant =>
          isBot(deserializePlayer(participant.player))
        )
      ) {
        for (const participant of humanParticipants(proposal)) {
          await this.penalties.deleteRefusalPenalty(
            deserializePlayer(participant.player)
          )
        }
      }
      const response = await this.env.MATCH_SERVICE.fetch(
        new Request('https://cloud-weasel-match/internal/matches', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'idempotency-key': proposal.id,
            [INTERNAL_AUTH_HEADER]: this.env.INTERNAL_AUTH_SECRET
          },
          body: JSON.stringify({
            proposalId: proposal.id,
            participants: proposal.participants,
            createdAtMs: proposal.createdAtMs
          })
        })
      )
      if (!response.ok && response.status >= 400 && response.status < 500) {
        let body: unknown
        try {
          body = await response.json()
        } catch {
          body = undefined
        }
        const serviceReason =
          isRecord(body) && typeof body.reason === 'string'
            ? body.reason
            : undefined
        const serviceError =
          isRecord(body) && typeof body.error === 'string'
            ? body.error
            : 'match creation failed'
        const reason =
          serviceReason ??
          (response.status === 403
            ? 'INVALID_ACCOUNT'
            : serviceError === 'game mode is disabled'
              ? 'GAME_MODE_DISABLED'
              : response.status === 400
                ? 'INVALID_OPERATION'
                : 'MATCH_CREATION_FAILED')
        console.warn(
          'match service rejected proposal',
          proposal.id,
          response.status,
          reason,
          serviceError
        )
        this.broadcastProposal(proposal, errorMessage(reason))
        await this.deleteProposal(proposal)
        return
      }
      if (!response.ok)
        throw new Error(`match service returned ${response.status}`)
      const result = (await response.json()) as { serverAddress?: unknown }
      if (
        typeof result.serverAddress !== 'string' ||
        result.serverAddress.length === 0
      ) {
        throw new Error('match service omitted serverAddress')
      }
      allocationConfirmed = true
      proposal.status = 'ALLOCATED'
      proposal.serverAddress = result.serverAddress
      proposal.nextDispatchAtMs = Date.now() + 1
      await this.persistProposalWithAlarm(proposal)
      await this.completeAllocatedProposal(proposal)
    } catch (error) {
      console.error('match dispatch failed', proposal.id, error)
      // The service allocation is idempotent and authoritative. If local
      // persistence or delivery fails after its 200 response, leave the
      // already-persisted DISPATCHING watchdog (or ALLOCATED handoff) intact.
      // Releasing these players could create a second proposal for an active
      // game.
      if (allocationConfirmed) return
      if (proposal.dispatchAttempts >= this.config.dispatchMaxAttempts) {
        await this.releaseProposalPlayers(proposal)
        return
      }
      proposal.status = 'ACCEPTED'
      proposal.nextDispatchAtMs =
        Date.now() +
        Math.min(30_000, 1_000 * 2 ** Math.min(proposal.dispatchAttempts, 5))
      await this.state.storage.put(proposalKey(proposal.id), proposal)
    }
  }

  private async persistProposalWithAlarm(proposal: StoredProposal) {
    const deadline = proposal.nextDispatchAtMs
    if (deadline === undefined) {
      await this.state.storage.put(proposalKey(proposal.id), proposal)
      return
    }
    await this.state.storage.transaction(async transaction => {
      const currentAlarm = await transaction.getAlarm()
      await transaction.put(proposalKey(proposal.id), proposal)
      await transaction.setAlarm(
        currentAlarm === null ? deadline : Math.min(currentAlarm, deadline)
      )
    })
  }

  private async completeAllocatedProposal(proposal: StoredProposal) {
    if (!proposal.serverAddress) {
      proposal.status = 'DISPATCHING'
      proposal.nextDispatchAtMs = Date.now()
      await this.state.storage.put(proposalKey(proposal.id), proposal)
      return
    }
    for (const participant of humanParticipants(proposal)) {
      this.sendToPrincipal(participant.player.address, {
        type: 'match_made',
        serverAddress: proposal.serverAddress
      })
      this.sendToPrincipal(participant.player.address, {
        type: 'match_ready_to_start',
        mode: participant.player.mode
      })
    }
    await this.deleteProposal(proposal)
  }

  // Source oracle: director/matchhandlers/match_handler.go calls ReleasePlayer
  // for every participant when game creation fails. Cloudflare gets a bounded
  // retry budget first because the match-service/game calls are idempotent;
  // exhaustion restores connected humans without refusal/timeout penalties.
  private async releaseProposalPlayers(proposal: StoredProposal) {
    const tickets: Record<string, StoredTicket> = {}
    for (const participant of humanParticipants(proposal)) {
      if (
        participant.request &&
        participant.identity &&
        this.hasSubscribedSocket(participant.player.address)
      ) {
        tickets[ticketKey(participant.player.address)] = {
          player: participant.player,
          request: participant.request,
          identity: participant.identity
        }
      }
    }
    await this.deleteProposal(proposal)
    if (Object.keys(tickets).length > 0) {
      await this.state.storage.put(tickets)
    }
    console.warn(
      'matchmaker released proposal after dispatch retries',
      proposal.id,
      proposal.dispatchAttempts,
      Object.keys(tickets).length
    )
  }

  // Source oracle: gamemodechecker caches the API switchboard for ten seconds.
  // A failed refresh must preserve queued state and pause matching/dispatch.
  private async currentEnabledGameModes(
    now: number
  ): Promise<Set<GameMode> | undefined> {
    if (
      this.gameModeStatusCache &&
      now - this.gameModeStatusCache.checkedAtMs <
        this.config.gameModeStatusCacheTtlMs
    ) {
      return this.gameModeStatusCache.enabledModes
    }
    if (!this.env.MATCH_SERVICE) return undefined
    try {
      const response = await this.env.MATCH_SERVICE.fetch(
        new Request(
          'https://cloud-weasel-match/internal/matchmaker/game-modes',
          {
            headers: {
              [INTERNAL_AUTH_HEADER]: this.env.INTERNAL_AUTH_SECRET
            }
          }
        )
      )
      const body: unknown = await response.json()
      if (!response.ok || !isRecord(body) || !isRecord(body.status)) {
        throw new Error(`match service returned ${response.status}`)
      }
      const enabledModes = new Set<GameMode>()
      for (const [mode, field] of Object.entries(gameModeStatusFields)) {
        const value = body.status[field]
        if (typeof value !== 'boolean') {
          throw new Error(`match service omitted ${field}`)
        }
        if (value) enabledModes.add(mode as GameMode)
      }
      this.gameModeStatusCache = { checkedAtMs: now, enabledModes }
      return enabledModes
    } catch (error) {
      console.error('matchmaker game-mode refresh failed', error)
      this.gameModeStatusCache = undefined
      return undefined
    }
  }

  // Source oracle: custommatchmaker/backend_service.go drains waiting players
  // with GAME_MODE_DISABLED and accepted proposals with SERVER_SHUTDOWN.
  private async drainDisabledMatchmaking(enabledModes: Set<GameMode>) {
    const tickets = await this.state.storage.list<StoredTicket>({
      prefix: TICKET_PREFIX
    })
    const disabledTicketKeys: string[] = []
    for (const [key, ticket] of tickets) {
      if (enabledModes.has(ticket.player.mode)) continue
      this.sendToPrincipal(
        ticket.player.address,
        errorMessage('GAME_MODE_DISABLED')
      )
      disabledTicketKeys.push(key)
    }
    if (disabledTicketKeys.length > 0) {
      await this.state.storage.delete(disabledTicketKeys)
    }

    const proposals = await this.state.storage.list<StoredProposal>({
      prefix: PROPOSAL_PREFIX
    })
    for (const proposal of proposals.values()) {
      if (
        proposal.status === 'ACCEPTED' &&
        this.proposalUsesDisabledMode(proposal, enabledModes)
      ) {
        await this.drainAcceptedProposal(proposal)
      }
    }
  }

  private proposalUsesDisabledMode(
    proposal: StoredProposal,
    enabledModes: Set<GameMode>
  ) {
    return proposal.participants.some(
      participant => !enabledModes.has(participant.player.mode)
    )
  }

  private async drainAcceptedProposal(proposal: StoredProposal) {
    this.broadcastProposal(proposal, errorMessage('SERVER_SHUTDOWN'))
    await this.deleteProposal(proposal)
    console.warn('matchmaker drained disabled accepted proposal', proposal.id)
  }

  private async rescheduleAlarm(now: number) {
    await this.syncMatchRunnerStates(now)
    const [proposals, runners] = await Promise.all([
      this.state.storage.list<StoredProposal>({ prefix: PROPOSAL_PREFIX }),
      this.state.storage.list<StoredMatchRunner>({
        prefix: MATCH_RUNNER_PREFIX
      })
    ])
    const candidates: number[] = []
    for (const socket of this.state.getWebSockets()) {
      const attachment =
        socket.deserializeAttachment() as SocketAttachment | null
      if (socket.readyState !== WebSocket.OPEN || !attachment) continue
      if (attachment.subscribed === false) {
        candidates.push(
          Math.max(
            now + 1,
            attachment.connectedAtMs + this.config.authenticationTimeoutMs
          )
        )
        continue
      }
      candidates.push(
        Math.max(
          now + 1,
          this.socketLastMessageAtMs(socket, attachment, now) +
            MATCHMAKER_READ_TIMEOUT_MS
        )
      )
    }
    const proposalValues = [...proposals.values()]
    for (const proposal of proposalValues) {
      if (proposal.status === 'FOUND') {
        candidates.push(proposal.expiresAtMs)
        if (proposal.botAcceptAtMs !== undefined)
          candidates.push(proposal.botAcceptAtMs)
      } else if (this.env.MATCH_SERVICE !== undefined) {
        if (proposal.nextDispatchAtMs !== undefined) {
          candidates.push(proposal.nextDispatchAtMs)
        } else if (proposal.status !== 'ACCEPTED') {
          candidates.push(now + 1)
        }
      }
    }
    for (const runner of runners.values()) {
      candidates.push(Math.max(now + 1, runner.nextAtMs))
    }

    const next = candidates
      .filter(candidate => candidate > now)
      .sort((a, b) => a - b)[0]
    if (next !== undefined) await this.state.storage.setAlarm(next)
    else await this.state.storage.deleteAlarm()
  }

  private async scheduleAlarmAt(deadline: number) {
    await this.state.storage.transaction(async transaction => {
      const current = await transaction.getAlarm()
      if (current === null || deadline < current) {
        await transaction.setAlarm(deadline)
      }
    })
  }

  private expireUnauthenticatedSockets(now: number) {
    for (const socket of this.state.getWebSockets()) {
      const attachment =
        socket.deserializeAttachment() as SocketAttachment | null
      if (
        socket.readyState !== WebSocket.OPEN ||
        attachment?.subscribed !== false ||
        attachment.connectedAtMs + this.config.authenticationTimeoutMs > now
      ) {
        continue
      }
      try {
        // Source websocketHandler returns without an error when a client has no
        // player channel at the authentication deadline. Its deferred Client
        // cleanup closes the connection without sending an application error.
        socket.close()
      } catch {
        // A close/error event may race the Durable Object alarm.
      }
    }
  }

  private expireIdleSockets(now: number) {
    for (const socket of this.state.getWebSockets()) {
      const attachment =
        socket.deserializeAttachment() as SocketAttachment | null
      if (
        socket.readyState !== WebSocket.OPEN ||
        !attachment ||
        attachment.subscribed === false
      ) {
        continue
      }
      const lastMessageAtMs = this.socketLastMessageAtMs(
        socket,
        attachment,
        now
      )
      if (lastMessageAtMs + MATCHMAKER_READ_TIMEOUT_MS > now) continue
      try {
        // Source messageReceiver treats its 120-second read deadline as a
        // normal, error-free disconnect and supplies no close code or reason.
        socket.close()
      } catch {
        // A close/error event may race the Durable Object alarm.
      }
    }
  }

  private socketLastMessageAtMs(
    socket: WebSocket,
    attachment: SocketAttachment,
    now: number
  ) {
    const lastMessageAtMs = attachment.lastMessageAtMs
    if (
      typeof lastMessageAtMs === 'number' &&
      Number.isSafeInteger(lastMessageAtMs) &&
      lastMessageAtMs > 0 &&
      lastMessageAtMs <= now
    ) {
      return lastMessageAtMs
    }
    // The previously deployed attachment has no read timestamp. Give that
    // established channel exactly one source read window during a rolling
    // upgrade, persist it, and include it in every later alarm reschedule.
    attachment.lastMessageAtMs = now
    socket.serializeAttachment(attachment)
    return now
  }

  private async proposalForPrincipal(principal: string) {
    const pendingProposal = await this.pendingProposalReference(principal)
    return pendingProposal
      ? this.state.storage.get<StoredProposal>(
          proposalKey(pendingProposal.proposalId)
        )
      : undefined
  }

  private async pendingProposalReference(
    principal: string
  ): Promise<PendingProposalReference | undefined> {
    const stored = await this.state.storage.get<unknown>(pendingKey(principal))
    if (stored === undefined) return undefined
    if (typeof stored === 'string' && stored.length > 0) {
      return { proposalId: stored }
    }
    if (
      isRecord(stored) &&
      typeof stored.proposalId === 'string' &&
      stored.proposalId.length > 0 &&
      Number.isSafeInteger(stored.expiresAtMs) &&
      (stored.expiresAtMs as number) > 0
    ) {
      return stored as unknown as StoredPendingProposal
    }
    throw new Error('invalid pending match reference')
  }

  private async deleteProposal(proposal: StoredProposal) {
    await this.state.storage.delete([
      proposalKey(proposal.id),
      ...humanParticipants(proposal).map(participant =>
        pendingKey(participant.player.address)
      )
    ])
  }

  private broadcastProposal(
    proposal: StoredProposal,
    message: MatchmakerServerMessage
  ) {
    for (const participant of humanParticipants(proposal)) {
      this.sendToPrincipal(participant.player.address, message)
    }
  }

  private sendToPrincipal(principal: string, message: object) {
    const sockets = this.state
      .getWebSockets(principal)
      .filter(socket => this.isSubscribedSocket(socket))
    console.log(
      'matchmaker message delivery',
      (message as { type?: unknown }).type,
      sockets.length
    )
    for (const socket of sockets) {
      this.safeSend(socket, message)
    }
  }

  private notifyDuplicateSubscribers(current: WebSocket, principal: string) {
    for (const socket of this.state.getWebSockets(principal)) {
      if (socket === current || !this.isSubscribedSocket(socket)) continue
      this.safeSend(socket, errorMessage('DUPLICATE_CONNECTION'))
    }
  }

  private isSubscribedSocket(socket: WebSocket) {
    const attachment = socket.deserializeAttachment() as SocketAttachment | null
    // Attachments written by the previously deployed runtime predate this
    // field. Treat them as established channels during a rolling upgrade;
    // every newly accepted socket explicitly serializes false.
    return attachment !== null && attachment.subscribed !== false
  }

  private safeSend(socket: WebSocket, message: object) {
    try {
      socket.send(JSON.stringify(message))
    } catch (error) {
      console.error('matchmaker socket send failed', error)
      // Close/error handlers perform durable cleanup.
    }
  }

  private hasSubscribedSocket(principal: string) {
    return this.state
      .getWebSockets(principal)
      .some(
        socket =>
          socket.readyState === WebSocket.OPEN &&
          this.isSubscribedSocket(socket)
      )
  }

  private async cleanupSocket(webSocket: WebSocket) {
    const attachment =
      webSocket.deserializeAttachment() as SocketAttachment | null
    if (!attachment) return
    if (this.hasSubscribedSocket(attachment.principal)) return
    try {
      // Source DeclineMatchChannelCloser invokes the same Decliner used by the
      // explicit command after the final subscription closes.
      await this.declineMatch(attachment.principal)
    } catch (error) {
      // The source player-channel factory logs closer errors after cleanup;
      // websocket closure itself remains complete.
      console.error('matchmaker socket cleanup decline failed', error)
    }
  }
}
