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
  sameIpAddressValidator,
  sessionValidator,
  versionValidator,
  WaitTimeScoreCalculator
} from './criteria'
import { CaptchaGuard, readCaptchaConfig } from './captcha'
import {
  normalizePrivateSeedForIdentity,
  prismsFromPrivateSeed,
  validateGameModeDataConsistency
} from './admission'
import { MatchProposal, processCombinations, combinePlayers } from './matcher'
import {
  BOT_PLAYER_ADDRESS,
  createBotPlayer,
  createPlayer,
  isBot,
  isChallengeMatch,
  isConquestMatch,
  MatchmakerPlayer,
  prismsToDeckClass,
  Rarity
} from './model'
import { PenaltyTracker, readPenaltyConfig } from './penalties'
import {
  errorMessage,
  FindMatchCommand,
  MatchmakerServerMessage,
  parseClientCommand,
  ProtocolError
} from './protocol'

const TICKET_PREFIX = 'ticket:'
const PROPOSAL_PREFIX = 'proposal:'
const PENDING_PREFIX = 'pending:'
export const TRUSTED_PRINCIPAL_HEADER = 'x-cloud-weasel-principal'
export const TRUSTED_USER_ID_HEADER = 'x-cloud-weasel-user-id'
export const TRUSTED_DISPLAY_NAME_HEADER = 'x-cloud-weasel-display-name'
export const TRUSTED_CLIENT_IP_HEADER = 'x-cloud-weasel-client-ip'
export const INTERNAL_AUTH_HEADER = 'x-cloud-weasel-internal-auth'

export interface MatchmakerEnv {
  MATCHMAKER_POOLS: DurableObjectNamespace
  INTERNAL_AUTH_SECRET: string
  ALLOWED_ORIGINS?: string
  MATCH_ACCEPTANCE_TIMEOUT_MS?: string
  MATCH_ACCEPTANCE_PENALTY_MS?: string
  MATCH_REFUSAL_WINDOW_MS?: string
  MATCH_REFUSAL_PENALTY_SECONDS?: string
  MATCH_TICK_MS?: string
  RELAX_MATCHING_INTERVAL_MS?: string
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

type StoredProposalStatus = 'FOUND' | 'ACCEPTED' | 'DISPATCHING'

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
}

interface RuntimeConfig {
  acceptanceTimeoutMs: number
  tickMs: number
  relaxIntervalMs: number
  expectedReleaseVersion: string
  enableRankedBots: boolean
  allowSameIpMatch: boolean
  strictConquestMatching: boolean
}

interface MatchmakingProfile {
  score: number
  rank: PlayerRank
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
    acceptanceTimeoutMs: parsePositiveInteger(
      env.MATCH_ACCEPTANCE_TIMEOUT_MS,
      30_000,
      120_000
    ),
    tickMs: parsePositiveInteger(env.MATCH_TICK_MS, 2_000, 30_000),
    relaxIntervalMs: parsePositiveInteger(
      env.RELAX_MATCHING_INTERVAL_MS,
      30_000,
      10 * 60_000
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

export class MatchmakerPool implements DurableObject {
  private readonly config: RuntimeConfig
  private readonly penalties: PenaltyTracker
  private readonly captcha: CaptchaGuard

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

    const previousSockets = this.state.getWebSockets(attachment.principal)
    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)
    server.serializeAttachment(attachment)
    this.state.acceptWebSocket(server, [attachment.principal])

    for (const previous of previousSockets) {
      this.safeSend(previous, errorMessage('DUPLICATE_CONNECTION'))
      try {
        previous.close(4001, 'Duplicate connection')
      } catch {
        // Hibernating sockets can race with their close event.
      }
    }

    return new Response(null, { status: 101, webSocket: client })
  }

  async webSocketMessage(webSocket: WebSocket, raw: string | ArrayBuffer) {
    const attachment =
      webSocket.deserializeAttachment() as SocketAttachment | null
    if (!attachment) {
      this.safeSend(
        webSocket,
        errorMessage('INVALID_OPERATION', 'missing identity')
      )
      webSocket.close(1008, 'Missing identity')
      return
    }

    try {
      const command = parseClientCommand(raw)
      switch (command.type) {
        case 'ping':
          // Source matcher heartbeats are one-way. Sending a new message type
          // would make the preserved browser client attempt to parse it.
          return
        case 'find_match':
          await this.findMatch(attachment, command)
          return
        case 'accept_match':
          // The command's playerID is intentionally ignored. The authenticated
          // WebSocket principal is the sole authority for this transition.
          await this.acceptMatch(attachment.principal)
          return
        case 'decline_match':
          await this.declineMatch(attachment.principal)
          return
      }
    } catch (error) {
      if (error instanceof ProtocolError) {
        console.warn(
          'matchmaker protocol rejected',
          error.reason,
          error.message
        )
        this.safeSend(webSocket, errorMessage(error.reason, error.message))
      } else {
        console.error('matchmaker message failed', error)
        this.safeSend(webSocket, errorMessage('INVALID_OPERATION'))
      }
    }
  }

  async webSocketClose(webSocket: WebSocket) {
    await this.cleanupSocket(webSocket)
  }

  async webSocketError(webSocket: WebSocket) {
    await this.cleanupSocket(webSocket)
  }

  async alarm() {
    const now = Date.now()
    await this.processProposalTimers(now)
    await this.attemptMatches(now)
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
      connectedAtMs: Date.now()
    }
  }

  private async findMatch(
    attachment: SocketAttachment,
    rawCommand: FindMatchCommand
  ) {
    let command = rawCommand
    const pendingProposalId = await this.state.storage.get<string>(
      pendingKey(attachment.principal)
    )
    if (pendingProposalId) {
      const proposal = await this.state.storage.get<StoredProposal>(
        proposalKey(pendingProposalId)
      )
      if (proposal) {
        if (proposal.status === 'FOUND' && proposal.expiresAtMs <= Date.now()) {
          await this.expireProposal(proposal)
        } else {
          this.replayProposal(attachment.principal, proposal)
          return
        }
      } else {
        await this.state.storage.delete(pendingKey(attachment.principal))
      }
    }

    // Source oracle: frontend/findmatch/validators/version.go rejects a stale
    // release before authentication, captcha, profile hydration, or queueing.
    if (command.versionHash !== this.config.expectedReleaseVersion) {
      throw new ProtocolError('OUTDATED_CLIENT', 'OUTDATED_CLIENT')
    }

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
    if (profile.activeMatch) {
      this.sendToPrincipal(attachment.principal, {
        type: 'match_made',
        serverAddress: profile.activeMatch.serverAddress
      })
      this.sendToPrincipal(attachment.principal, {
        type: 'match_ready_to_start',
        mode: profile.activeMatch.mode
      })
      return
    }

    const penaltyMs = Math.max(
      profile.abandonPenaltyMs,
      await this.penalties.getPenaltyMs({
        address: attachment.principal,
        mode: command.mode
      })
    )
    if (penaltyMs > 0) {
      this.sendToPrincipal(attachment.principal, {
        type: 'match_refusal_cooldown',
        durationSeconds: Math.floor(penaltyMs / 1_000)
      })
      return
    }

    const prisms = prismsFromPrivateSeed(command.privateSeed)
    if (
      command.mode === GameMode.CONQUEST_CONSTRUCTED ||
      command.mode === GameMode.CONQUEST_DISCOVERY
    ) {
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
    await this.state.storage.put(ticketKey(attachment.principal), ticket)
    console.log('matchmaker ticket accepted', command.mode)
    await this.attemptMatches(Date.now())
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
    if (!body.gameModeEnabled) {
      throw new ProtocolError('GAME_MODE_DISABLED', 'GAME_MODE_DISABLED')
    }
    const profile = body.profile
    if (
      !isRecord(profile) ||
      !Number.isSafeInteger(profile.score) ||
      Math.abs(profile.score as number) > 2_147_483_647 ||
      !playerRanks.has(profile.rank as PlayerRank) ||
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
      score: profile.score as number,
      rank: profile.rank as PlayerRank,
      lostLastMatch: profile.lostLastMatch,
      cards,
      recentMatches,
      abandonPenaltyMs: profile.abandonPenaltyMs as number,
      ...(conquest ? { conquest } : {}),
      ...(activeMatch ? { activeMatch } : {})
    }
  }

  private async acceptMatch(principal: string) {
    const proposal = await this.proposalForPrincipal(principal)
    if (!proposal || proposal.status !== 'FOUND') {
      this.sendToPrincipal(principal, errorMessage('INVALID_OPERATION'))
      return
    }
    if (proposal.expiresAtMs <= Date.now()) {
      await this.expireProposal(proposal)
      return
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
    if (proposal.accepted.includes(principal)) return

    proposal.accepted.push(principal)
    await this.state.storage.put(proposalKey(proposal.id), proposal)
    this.broadcastProposal(proposal, {
      type: 'accept_match',
      playerID: principal
    })

    if (addresses.every(address => proposal.accepted.includes(address))) {
      proposal.status = 'ACCEPTED'
      proposal.nextDispatchAtMs = Date.now()
      await this.state.storage.put(proposalKey(proposal.id), proposal)
      await this.dispatchProposal(proposal)
    }
  }

  private async declineMatch(principal: string) {
    const proposal = await this.proposalForPrincipal(principal)
    if (!proposal) {
      await this.state.storage.delete(ticketKey(principal))
      return
    }
    const player = proposal.participants.find(
      participant => participant.player.address === principal
    )
    if (player && isConquestMatch(deserializePlayer(player.player))) {
      this.sendToPrincipal(principal, errorMessage('INVALID_OPERATION'))
      return
    }
    this.broadcastProposal(proposal, {
      type: 'decline_match',
      playerID: principal
    })
    await this.deleteProposal(proposal)
    if (player && !isChallengeMatch(deserializePlayer(player.player))) {
      await this.penalties.setRefusalPenalty(deserializePlayer(player.player))
    }
    await this.rescheduleAlarm(Date.now())
  }

  private async attemptMatches(now: number) {
    const storedTickets = await this.state.storage.list<StoredTicket>({
      prefix: TICKET_PREFIX
    })
    const tickets = [...storedTickets.values()].filter(ticket =>
      this.hasSocket(ticket.player.address)
    )
    const byAddress = new Map(
      tickets.map(ticket => [ticket.player.address, ticket])
    )

    for (const ticket of tickets.filter(
      current =>
        current.player.mode === GameMode.PRACTICE_BOT ||
        current.player.mode === GameMode.WARM_UP
    )) {
      if (!(await this.state.storage.get(ticketKey(ticket.player.address))))
        continue
      const human = deserializePlayer(ticket.player)
      await this.createProposal(
        [human, createBotPlayer(human.mode, { prisms: human.prisms })],
        byAddress,
        now
      )
    }

    const groups: GameMode[][] = [
      [GameMode.PRACTICE_PVP, GameMode.RANKED_CONSTRUCTED],
      [GameMode.RANKED_DISCOVERY],
      [GameMode.CONQUEST_CONSTRUCTED],
      [GameMode.CONQUEST_DISCOVERY],
      [GameMode.CHALLENGE_CONSTRUCTED],
      [GameMode.CHALLENGE_DISCOVERY]
    ]
    for (const modes of groups) {
      const candidates = [...byAddress.values()]
        .filter(ticket => modes.includes(ticket.player.mode))
        .filter(ticket => storedTickets.has(ticketKey(ticket.player.address)))
        .map(ticket => deserializePlayer(ticket.player))
      await this.matchGroup(candidates, byAddress, now, modes)
    }
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

    const interval = {
      defaultMs: this.config.relaxIntervalMs,
      rankedConstructedMs: this.config.relaxIntervalMs,
      rankedDiscoveryMs: this.config.relaxIntervalMs,
      conquestConstructedMs: this.config.relaxIntervalMs,
      conquestDiscoveryMs: this.config.relaxIntervalMs
    }
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
    const proposals = processCombinations(combinations, {
      createRegistered: player =>
        createBotPlayer(player.mode, { prisms: player.prisms })
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
    for (const principal of humanAddresses)
      writes[pendingKey(principal)] = proposal.id
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

  private async processProposalTimers(now: number) {
    const stored = await this.state.storage.list<StoredProposal>({
      prefix: PROPOSAL_PREFIX
    })
    for (const proposal of stored.values()) {
      if (
        proposal.status === 'FOUND' &&
        proposal.botAcceptAtMs !== undefined &&
        proposal.botAcceptAtMs <= now &&
        !proposal.accepted.includes(BOT_PLAYER_ADDRESS)
      ) {
        await this.recordAcceptance(proposal, BOT_PLAYER_ADDRESS)
      }
      if (proposal.status === 'FOUND' && proposal.expiresAtMs <= now) {
        await this.expireProposal(proposal)
      } else if (
        proposal.status !== 'FOUND' &&
        proposal.nextDispatchAtMs !== undefined &&
        proposal.nextDispatchAtMs <= now
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
    proposal.status = 'DISPATCHING'
    proposal.dispatchAttempts += 1
    proposal.nextDispatchAtMs = undefined
    await this.state.storage.put(proposalKey(proposal.id), proposal)

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
        this.broadcastProposal(proposal, errorMessage(reason, serviceError))
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
      for (const participant of humanParticipants(proposal)) {
        this.sendToPrincipal(participant.player.address, {
          type: 'match_made',
          serverAddress: result.serverAddress
        })
        this.sendToPrincipal(participant.player.address, {
          type: 'match_ready_to_start',
          mode: participant.player.mode
        })
      }
      await this.deleteProposal(proposal)
    } catch (error) {
      console.error('match dispatch failed', proposal.id, error)
      proposal.status = 'ACCEPTED'
      proposal.nextDispatchAtMs =
        Date.now() +
        Math.min(30_000, 1_000 * 2 ** Math.min(proposal.dispatchAttempts, 5))
      await this.state.storage.put(proposalKey(proposal.id), proposal)
    }
  }

  private async rescheduleAlarm(now: number) {
    const [tickets, proposals] = await Promise.all([
      this.state.storage.list<StoredTicket>({ prefix: TICKET_PREFIX }),
      this.state.storage.list<StoredProposal>({ prefix: PROPOSAL_PREFIX })
    ])
    const candidates: number[] = []
    const proposalValues = [...proposals.values()]
    for (const proposal of proposalValues) {
      if (proposal.status === 'FOUND') {
        candidates.push(proposal.expiresAtMs)
        if (proposal.botAcceptAtMs !== undefined)
          candidates.push(proposal.botAcceptAtMs)
      } else if (
        proposal.nextDispatchAtMs !== undefined &&
        this.env.MATCH_SERVICE !== undefined
      ) {
        candidates.push(proposal.nextDispatchAtMs)
      }
    }
    if (
      tickets.size >= 2 ||
      (tickets.size >= 1 && this.config.enableRankedBots)
    ) {
      candidates.push(now + this.config.tickMs)
    }

    const next = candidates
      .filter(candidate => candidate > now)
      .sort((a, b) => a - b)[0]
    if (next !== undefined) await this.state.storage.setAlarm(next)
    else await this.state.storage.deleteAlarm()
  }

  private async proposalForPrincipal(principal: string) {
    const id = await this.state.storage.get<string>(pendingKey(principal))
    return id
      ? this.state.storage.get<StoredProposal>(proposalKey(id))
      : undefined
  }

  private replayProposal(principal: string, proposal: StoredProposal) {
    const participant = proposal.participants.find(
      current => current.player.address === principal
    )
    if (!participant) return
    if (proposal.status === 'FOUND') {
      this.sendToPrincipal(principal, {
        type: 'match_found',
        mode: participant.player.mode,
        timeoutMs: Math.max(0, proposal.expiresAtMs - Date.now()),
        playerIDs: proposal.participants.map(current => current.player.address)
      })
    }
    for (const accepted of proposal.accepted) {
      this.sendToPrincipal(principal, {
        type: 'accept_match',
        playerID: accepted
      })
    }
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
    const sockets = this.state.getWebSockets(principal)
    console.log(
      'matchmaker message delivery',
      (message as { type?: unknown }).type,
      sockets.length
    )
    for (const socket of sockets) {
      this.safeSend(socket, message)
    }
  }

  private safeSend(socket: WebSocket, message: object) {
    try {
      socket.send(JSON.stringify(message))
    } catch (error) {
      console.error('matchmaker socket send failed', error)
      // Close/error handlers perform durable cleanup.
    }
  }

  private hasSocket(principal: string) {
    return this.state
      .getWebSockets(principal)
      .some(socket => socket.readyState === WebSocket.OPEN)
  }

  private async cleanupSocket(webSocket: WebSocket) {
    const attachment =
      webSocket.deserializeAttachment() as SocketAttachment | null
    if (!attachment) return
    if (this.hasSocket(attachment.principal)) return
    await this.state.storage.delete(ticketKey(attachment.principal))
    const proposal = await this.proposalForPrincipal(attachment.principal)
    if (proposal) {
      const participant = proposal.participants.find(
        current => current.player.address === attachment.principal
      )
      if (
        !participant ||
        !isConquestMatch(deserializePlayer(participant.player))
      ) {
        this.broadcastProposal(proposal, {
          type: 'decline_match',
          playerID: attachment.principal
        })
        await this.deleteProposal(proposal)
        if (participant) {
          const player = deserializePlayer(participant.player)
          if (!isChallengeMatch(player)) {
            await this.penalties.setRefusalPenalty(player)
          }
        }
      }
    }
    await this.rescheduleAlarm(Date.now())
  }
}
