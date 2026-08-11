import { CardClass, GameMode, PlayerRank } from '@opensky/proto'

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
import { MatchProposal, processCombinations, combinePlayers } from './matcher'
import {
  BOT_PLAYER_ADDRESS,
  createBotPlayer,
  createPlayer,
  isBot,
  isConquestMatch,
  MatchmakerPlayer,
  Rarity
} from './model'
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
const POOL_VERSION = 1

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
  MATCH_TICK_MS?: string
  RELAX_MATCHING_INTERVAL_MS?: string
  ENABLE_RANKED_BOTS?: string
  ALLOW_SAME_IP_MATCH?: string
  STRICT_CONQUEST_MATCHING?: string
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
  enableRankedBots: boolean
  allowSameIpMatch: boolean
  strictConquestMatching: boolean
}

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

const readConfig = (env: MatchmakerEnv): RuntimeConfig => ({
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
  enableRankedBots: bool(env.ENABLE_RANKED_BOTS, false),
  allowSameIpMatch: bool(env.ALLOW_SAME_IP_MATCH, false),
  strictConquestMatching: bool(env.STRICT_CONQUEST_MATCHING, false)
})

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

const prismMap: Record<string, CardClass> = {
  str: CardClass.STR,
  hrt: CardClass.HRT,
  agy: CardClass.AGY,
  int: CardClass.INT,
  wis: CardClass.WIS,
  tok: CardClass.TOK,
  STR: CardClass.STR,
  HRT: CardClass.HRT,
  AGY: CardClass.AGY,
  INT: CardClass.INT,
  WIS: CardClass.WIS,
  TOK: CardClass.TOK
}

const prismsFromPrivateSeed = (privateSeed: Record<string, unknown>) => {
  const values = Array.isArray(privateSeed.prisms) ? privateSeed.prisms : []
  return values
    .map((value) => (typeof value === 'string' ? prismMap[value] : undefined))
    .filter((value): value is CardClass => value !== undefined)
}

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
    (participant) => !isBot(deserializePlayer(participant.player))
  )

export class MatchmakerPool implements DurableObject {
  private readonly config: RuntimeConfig

  constructor(
    private readonly state: DurableObjectState,
    private readonly env: MatchmakerEnv
  ) {
    this.config = readConfig(env)
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === '/internal/status') {
      if (request.headers.get(INTERNAL_AUTH_HEADER) !== this.env.INTERNAL_AUTH_SECRET) {
        return Response.json({ error: 'not found' }, { status: 404 })
      }
      const [tickets, proposals] = await Promise.all([
        this.state.storage.list({ prefix: TICKET_PREFIX }),
        this.state.storage.list({ prefix: PROPOSAL_PREFIX })
      ])
      return Response.json({
        component: 'cloud-weasel-matchmaker-pool',
        poolVersion: POOL_VERSION,
        queuedPlayers: tickets.size,
        activeProposals: proposals.size,
        connectedSockets: this.state.getWebSockets().length
      })
    }

    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 })
    }

    const attachment = this.attachmentFromRequest(request)
    if (!attachment) return new Response('Missing trusted identity', { status: 401 })

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
    const attachment = webSocket.deserializeAttachment() as SocketAttachment | null
    if (!attachment) {
      this.safeSend(webSocket, errorMessage('INVALID_OPERATION', 'missing identity'))
      webSocket.close(1008, 'Missing identity')
      return
    }

    try {
      const command = parseClientCommand(raw)
      switch (command.type) {
        case 'ping':
          webSocket.send(JSON.stringify({ type: 'pong' }))
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
    if (!principal || !/^0x[0-9a-f]{40}$/.test(principal) || !userId) return null
    return {
      principal,
      userId: userId.slice(0, 256),
      displayName: (request.headers.get(TRUSTED_DISPLAY_NAME_HEADER) ?? '').slice(
        0,
        256
      ),
      clientIp: (request.headers.get(TRUSTED_CLIENT_IP_HEADER) ?? '').slice(0, 128),
      connectedAtMs: Date.now()
    }
  }

  private async findMatch(attachment: SocketAttachment, command: FindMatchCommand) {
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

    const player = createPlayer({
      address: attachment.principal,
      mode: command.mode,
      prisms: prismsFromPrivateSeed(command.privateSeed),
      sessionId: command.sessionID,
      playerSessionId: command.playerSessionID,
      clientVersionHash: command.versionHash,
      ipAddress: attachment.clientIp,
      initTimestampMs: Date.now(),
      // These fields are deliberately server defaults until the account profile
      // resolver milestone. They are never accepted from the client message.
      score: 0,
      rank: PlayerRank.UNKNOWN,
      lostLastMatch: false
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
    await this.attemptMatches(Date.now())
    await this.rescheduleAlarm(Date.now())
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
    const addresses = proposal.participants.map((participant) => participant.player.address)
    if (!addresses.includes(principal)) {
      this.sendToPrincipal(principal, errorMessage('INVALID_OPERATION'))
      return
    }
    if (proposal.accepted.includes(principal)) return

    proposal.accepted.push(principal)
    await this.state.storage.put(proposalKey(proposal.id), proposal)
    this.broadcastProposal(proposal, { type: 'accept_match', playerID: principal })

    if (addresses.every((address) => proposal.accepted.includes(address))) {
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
      (participant) => participant.player.address === principal
    )
    if (player && isConquestMatch(deserializePlayer(player.player))) {
      this.sendToPrincipal(principal, errorMessage('INVALID_OPERATION'))
      return
    }
    this.broadcastProposal(proposal, { type: 'decline_match', playerID: principal })
    await this.deleteProposal(proposal)
    await this.rescheduleAlarm(Date.now())
  }

  private async attemptMatches(now: number) {
    const storedTickets = await this.state.storage.list<StoredTicket>({
      prefix: TICKET_PREFIX
    })
    const tickets = [...storedTickets.values()].filter((ticket) =>
      this.hasSocket(ticket.player.address)
    )
    const byAddress = new Map(tickets.map((ticket) => [ticket.player.address, ticket]))

    for (const ticket of tickets.filter(
      (current) =>
        current.player.mode === GameMode.PRACTICE_BOT ||
        current.player.mode === GameMode.WARM_UP
    )) {
      if (!(await this.state.storage.get(ticketKey(ticket.player.address)))) continue
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
        .filter((ticket) => modes.includes(ticket.player.mode))
        .filter((ticket) => storedTickets.has(ticketKey(ticket.player.address)))
        .map((ticket) => deserializePlayer(ticket.player))
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
      (mode) =>
        mode === GameMode.RANKED_CONSTRUCTED || mode === GameMode.RANKED_DISCOVERY
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
    const conquestWins = new WaitTimeScoreCalculator(interval, [0, 1, 2], () => now)
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
      createRegistered: (player) =>
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
    const humanAddresses = players.filter((player) => !isBot(player)).map((p) => p.address)
    if (humanAddresses.some((address) => !byAddress.has(address))) return
    for (const address of humanAddresses) {
      if (!(await this.state.storage.get(ticketKey(address)))) return
    }

    const matchProposal = new MatchProposal(crypto.randomUUID(), players)
    const proposal: StoredProposal = {
      id: matchProposal.id,
      status: 'FOUND',
      participants: players.map((player) => {
        const ticket = byAddress.get(player.address)
        return ticket ? participantFromTicket(ticket) : participantFromBot(player)
      }),
      accepted: [],
      createdAtMs: now,
      expiresAtMs: now + this.config.acceptanceTimeoutMs,
      botAcceptAtMs: players.some(isBot) ? now + 1_000 : undefined,
      dispatchAttempts: 0
    }

    const writes: Record<string, unknown> = { [proposalKey(proposal.id)]: proposal }
    for (const principal of humanAddresses) writes[pendingKey(principal)] = proposal.id
    await this.state.storage.put(writes)
    await this.state.storage.delete(humanAddresses.map(ticketKey))

    for (const principal of humanAddresses) {
      const participant = proposal.participants.find(
        (current) => current.player.address === principal
      )
      if (!participant) continue
      this.sendToPrincipal(principal, {
        type: 'match_found',
        mode: participant.player.mode,
        timeoutMs: this.config.acceptanceTimeoutMs,
        playerIDs: proposal.participants.map((current) => current.player.address)
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
      proposal.participants.map((participant) => deserializePlayer(participant.player))
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
    await this.deleteProposal(proposal)
  }

  private async dispatchProposal(proposal: StoredProposal) {
    if (!this.env.MATCH_SERVICE) return
    proposal.status = 'DISPATCHING'
    proposal.dispatchAttempts += 1
    proposal.nextDispatchAtMs = undefined
    await this.state.storage.put(proposalKey(proposal.id), proposal)

    try {
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
      if (!response.ok) throw new Error(`match service returned ${response.status}`)
      const result = (await response.json()) as { serverAddress?: unknown }
      if (typeof result.serverAddress !== 'string' || result.serverAddress.length === 0) {
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
        Date.now() + Math.min(30_000, 1_000 * 2 ** Math.min(proposal.dispatchAttempts, 5))
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
        if (proposal.botAcceptAtMs !== undefined) candidates.push(proposal.botAcceptAtMs)
      } else if (
        proposal.nextDispatchAtMs !== undefined &&
        this.env.MATCH_SERVICE !== undefined
      ) {
        candidates.push(proposal.nextDispatchAtMs)
      }
    }
    if (tickets.size >= 2 || (tickets.size >= 1 && this.config.enableRankedBots)) {
      candidates.push(now + this.config.tickMs)
    }

    const next = candidates.filter((candidate) => candidate > now).sort((a, b) => a - b)[0]
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
      (current) => current.player.address === principal
    )
    if (!participant) return
    if (proposal.status === 'FOUND') {
      this.sendToPrincipal(principal, {
        type: 'match_found',
        mode: participant.player.mode,
        timeoutMs: Math.max(0, proposal.expiresAtMs - Date.now()),
        playerIDs: proposal.participants.map((current) => current.player.address)
      })
    }
    for (const accepted of proposal.accepted) {
      this.sendToPrincipal(principal, { type: 'accept_match', playerID: accepted })
    }
  }

  private async deleteProposal(proposal: StoredProposal) {
    await this.state.storage.delete([
      proposalKey(proposal.id),
      ...humanParticipants(proposal).map((participant) =>
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
    for (const socket of this.state.getWebSockets(principal)) {
      this.safeSend(socket, message)
    }
  }

  private safeSend(socket: WebSocket, message: object) {
    try {
      socket.send(JSON.stringify(message))
    } catch {
      // Close/error handlers perform durable cleanup.
    }
  }

  private hasSocket(principal: string) {
    return this.state
      .getWebSockets(principal)
      .some((socket) => socket.readyState === WebSocket.OPEN)
  }

  private async cleanupSocket(webSocket: WebSocket) {
    const attachment = webSocket.deserializeAttachment() as SocketAttachment | null
    if (!attachment) return
    if (this.hasSocket(attachment.principal)) return
    await this.state.storage.delete(ticketKey(attachment.principal))
    const proposal = await this.proposalForPrincipal(attachment.principal)
    if (proposal) {
      const participant = proposal.participants.find(
        (current) => current.player.address === attachment.principal
      )
      if (!participant || !isConquestMatch(deserializePlayer(participant.player))) {
        this.broadcastProposal(proposal, {
          type: 'decline_match',
          playerID: attachment.principal
        })
        await this.deleteProposal(proposal)
      }
    }
    await this.rescheduleAlarm(Date.now())
  }
}
