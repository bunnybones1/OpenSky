import { GameMode, PlayerRank } from '@opensky/proto'
import { deriveGamePrincipal } from '@opensky/shared/game-principal'
import { MatchmakerStartMatchMessage } from '@opensky/shared/matchmaker-message-types'
import { legacyMatchMode } from '@opensky/shared/match-modes'

import { buildMatch } from './match-builder'
import {
  acceptedMatchFingerprint,
  DispatchProtocolError,
  INTERNAL_AUTH_HEADER,
  MAX_DISPATCH_BYTES,
  parseAcceptedMatchDispatch
} from './protocol'
import {
  MatchAllocationConflictError,
  MatchPreconditionError,
  MatchRepository
} from './repository'
import { createReadinessMatch, ReadinessMatchError } from './readiness-match'
import {
  selectRegisteredBot,
  validateRegisteredBotSelection
} from './registered-bot'
import { AccountActionsRepository } from '../../cloudflare/src/account-actions'
import { ConquestRepository } from '../../cloudflare/src/conquest'
import {
  CONQUEST_GAME_MODES,
  isConquestQueueReady
} from '../../cloudflare/src/conquest-readiness'
import { RpcError } from '../../cloudflare/src/errors'

interface CreateMatchRequest {
  proposalId: string
  releaseVersion: string
  match: MatchmakerStartMatchMessage
}

export interface MatchServiceEnv {
  AUTH_DB: D1Database
  GAME_SERVICE: Fetcher
  INTERNAL_AUTH_SECRET: string
  CURRENT_SEASON?: string
  TURN_TIMER_ENABLED?: string
  ENABLE_RANKED_BOTS?: string
  ENABLED_GAME_MODES?: string
}

const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: {
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff'
    }
  })

const season = (value: string | undefined) => {
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed < 10_000
    ? parsed
    : Math.floor(
        (Date.now() - Date.UTC(2021, 10, 22, 14, 0, 0)) /
          (4 * 7 * 24 * 60 * 60 * 1000)
      ) + 1
}

const enabled = (value: string | undefined) => value?.toLowerCase() !== 'false'

const explicitlyEnabled = (value: string | undefined) =>
  value?.toLowerCase() === 'true'

const DEFAULT_ENABLED_GAME_MODES = new Set<GameMode>([
  GameMode.PRACTICE_BOT,
  GameMode.WARM_UP,
  GameMode.PRACTICE_PVP,
  GameMode.RANKED_CONSTRUCTED,
  GameMode.RANKED_DISCOVERY,
  GameMode.CHALLENGE_CONSTRUCTED,
  GameMode.CHALLENGE_DISCOVERY
])

const enabledGameModes = (value: string | undefined) => {
  if (!value) return new Set(DEFAULT_ENABLED_GAME_MODES)
  const supported = new Set(Object.values(GameMode))
  return new Set(
    value
      .split(',')
      .map(mode => mode.trim())
      .filter((mode): mode is GameMode => supported.has(mode as GameMode))
  )
}

interface GameModeStatusRow {
  game_mode: GameMode
  enabled: number
}

export const currentEnabledGameModes = async (
  env: MatchServiceEnv,
  at = new Date()
) => {
  const modes = enabledGameModes(env.ENABLED_GAME_MODES)
  const rows = await env.AUTH_DB.prepare(
    `SELECT game_mode, enabled FROM game_mode_status`
  ).all<GameModeStatusRow>()
  for (const row of rows.results) {
    if (row.enabled === 1) modes.add(row.game_mode)
    else modes.delete(row.game_mode)
  }
  // An enable-time check is insufficient: a pool can expire while the D1
  // operator flag remains true. Clamp both queues at every admission read.
  if (!(await isConquestQueueReady(env.AUTH_DB, at))) {
    for (const mode of CONQUEST_GAME_MODES) modes.delete(mode as GameMode)
  }
  return modes
}

export const currentMatchmakerGameModes = async (
  env: MatchServiceEnv,
  at = new Date()
) => {
  const modes = await currentEnabledGameModes(env, at)
  const draining = await new ConquestRepository(env.AUTH_DB).drainingModes()
  for (const mode of draining) modes.add(mode)
  return modes
}

const gameModesStatus = (modes: Set<GameMode>) => {
  return {
    tutorial: true,
    practicePVP: modes.has(GameMode.PRACTICE_PVP),
    practiceBot: modes.has(GameMode.PRACTICE_BOT),
    warmUp: modes.has(GameMode.WARM_UP),
    rankedConstructed: modes.has(GameMode.RANKED_CONSTRUCTED),
    rankedDiscovery: modes.has(GameMode.RANKED_DISCOVERY),
    conquestConstructed: modes.has(GameMode.CONQUEST_CONSTRUCTED),
    conquestDiscovery: modes.has(GameMode.CONQUEST_DISCOVERY),
    challengeConstructed: modes.has(GameMode.CHALLENGE_CONSTRUCTED),
    challengeDiscovery: modes.has(GameMode.CHALLENGE_DISCOVERY)
  }
}

const authorized = (request: Request, env: MatchServiceEnv) =>
  env.INTERNAL_AUTH_SECRET.length >= 16 &&
  request.headers.get(INTERNAL_AUTH_HEADER) === env.INTERNAL_AUTH_SECRET

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const matchmakingProfile = async (
  request: Request,
  env: MatchServiceEnv
): Promise<Response> => {
  const declaredLength = Number(request.headers.get('content-length') ?? 0)
  if (declaredLength > 4 * 1024)
    return json({ error: 'request too large' }, 413)

  let body: unknown
  try {
    const text = await request.text()
    if (new TextEncoder().encode(text).byteLength > 4 * 1024) {
      return json({ error: 'request too large' }, 413)
    }
    body = JSON.parse(text)
  } catch {
    return json({ error: 'invalid profile request JSON' }, 400)
  }

  const modes = new Set(Object.values(GameMode))
  if (
    !record(body) ||
    typeof body.userId !== 'string' ||
    body.userId.length < 1 ||
    body.userId.length > 256 ||
    typeof body.principal !== 'string' ||
    !/^0x[0-9a-f]{40}$/.test(body.principal) ||
    typeof body.versionHash !== 'string' ||
    body.versionHash.length < 1 ||
    body.versionHash.length > 128 ||
    !modes.has(body.mode as GameMode)
  ) {
    return json({ error: 'invalid profile request' }, 400)
  }

  if ((await deriveGamePrincipal(body.userId)) !== body.principal) {
    return json({ error: 'identity principal mismatch' }, 403)
  }

  try {
    await new AccountActionsRepository(env.AUTH_DB).enforcePlayerAccess(
      body.userId
    )
    const repository = new MatchRepository(env.AUTH_DB)
    const profile = await repository.matchmakingProfile(
      body.userId,
      body.principal,
      body.mode as GameMode,
      season(env.CURRENT_SEASON),
      body.versionHash
    )
    const requiresRankedExperience = [
      GameMode.RANKED_CONSTRUCTED,
      GameMode.RANKED_DISCOVERY
    ].includes(body.mode as GameMode)
    const modes = await currentEnabledGameModes(env)
    const requestedMode = body.mode as GameMode
    const drainable =
      !modes.has(requestedMode) &&
      (await new ConquestRepository(env.AUTH_DB).isDrainable(
        body.userId,
        requestedMode
      ))
    return json({
      gameModeEnabled:
        (modes.has(requestedMode) || drainable) &&
        (!requiresRankedExperience || profile.rankedEligible),
      profile
    })
  } catch (error) {
    if (error instanceof RpcError && error.status === 403) {
      return json({ error: error.message }, 403)
    }
    if (error instanceof Error && error.message === 'player was not found') {
      return json({ error: error.message }, 404)
    }
    console.error('matchmaking profile failed', error)
    return json({ error: 'matchmaking profile failed' }, 500)
  }
}

const registeredBotSelection = async (
  request: Request,
  env: MatchServiceEnv
) => {
  if (!explicitlyEnabled(env.ENABLE_RANKED_BOTS)) {
    return json({ error: 'not found' }, 404)
  }
  const declaredLength = Number(request.headers.get('content-length') ?? 0)
  if (declaredLength > 4 * 1024) return json({ error: 'request too large' }, 413)
  let body: unknown
  try {
    const text = await request.text()
    if (new TextEncoder().encode(text).byteLength > 4 * 1024) {
      return json({ error: 'request too large' }, 413)
    }
    body = JSON.parse(text)
  } catch {
    return json({ error: 'invalid registered bot request JSON' }, 400)
  }
  if (
    !record(body) ||
    typeof body.userId !== 'string' ||
    body.userId.length < 1 ||
    body.userId.length > 256 ||
    typeof body.principal !== 'string' ||
    !/^0x[0-9a-f]{40}$/.test(body.principal) ||
    ![
      GameMode.PRACTICE_PVP,
      GameMode.RANKED_CONSTRUCTED,
      GameMode.RANKED_DISCOVERY
    ].includes(body.mode as GameMode) ||
    !Number.isSafeInteger(body.score) ||
    Math.abs(body.score as number) > 2_147_483_647 ||
    !Object.values(PlayerRank).includes(body.rank as PlayerRank)
  ) {
    return json({ error: 'invalid registered bot request' }, 400)
  }
  try {
    await new AccountActionsRepository(env.AUTH_DB).enforcePlayerAccess(
      body.userId
    )
    return json({
      bot: await selectRegisteredBot(
        env.AUTH_DB,
        {
          userId: body.userId,
          principal: body.principal,
          mode: body.mode as GameMode,
          score: body.score as number,
          rank: body.rank as PlayerRank
        },
        season(env.CURRENT_SEASON)
      )
    })
  } catch (error) {
    if (error instanceof RpcError && error.status === 403) {
      return json({ error: error.message }, 403)
    }
    console.error('registered bot selection failed', error)
    return json({ error: 'registered bot selection failed' }, 409)
  }
}

const dispatchToGame = async (
  request: CreateMatchRequest,
  env: MatchServiceEnv
) => {
  const response = await env.GAME_SERVICE.fetch(
    new Request('https://cloud-weasel-game/internal/matches', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        [INTERNAL_AUTH_HEADER]: env.INTERNAL_AUTH_SECRET
      },
      body: JSON.stringify(request)
    })
  )
  const body = (await response.json()) as {
    serverAddress?: unknown
    error?: unknown
  }
  if (!response.ok || typeof body.serverAddress !== 'string') {
    throw new Error(
      typeof body.error === 'string'
        ? body.error
        : `game service returned ${response.status}`
    )
  }
  return body.serverAddress
}

export default {
  async fetch(request: Request, env: MatchServiceEnv): Promise<Response> {
    const url = new URL(request.url)
    if (request.method === 'GET' && url.pathname === '/health') {
      return json({
        ok: true,
        component: 'cloud-weasel-match-service',
        protocolVersion: 1
      })
    }
    if (request.method === 'GET' && url.pathname === '/internal/game-modes') {
      if (!authorized(request, env)) return json({ error: 'not found' }, 404)
      return json({
        status: gameModesStatus(await currentEnabledGameModes(env))
      })
    }
    if (
      request.method === 'GET' &&
      url.pathname === '/internal/matchmaker/game-modes'
    ) {
      if (!authorized(request, env)) return json({ error: 'not found' }, 404)
      return json({
        status: gameModesStatus(await currentMatchmakerGameModes(env))
      })
    }
    if (
      request.method === 'POST' &&
      url.pathname === '/internal/matchmaker/player-profile'
    ) {
      if (!authorized(request, env)) return json({ error: 'not found' }, 404)
      return matchmakingProfile(request, env)
    }
    if (
      request.method === 'POST' &&
      url.pathname === '/internal/matchmaker/registered-bot'
    ) {
      if (!authorized(request, env)) return json({ error: 'not found' }, 404)
      return registeredBotSelection(request, env)
    }
    if (
      request.method === 'POST' &&
      url.pathname === '/internal/conquest-readiness/matches'
    ) {
      if (!authorized(request, env)) return json({ error: 'not found' }, 404)
      const declaredLength = Number(request.headers.get('content-length') ?? 0)
      if (declaredLength > 4 * 1024) {
        return json({ error: 'request too large' }, 413)
      }
      let body: unknown
      try {
        const text = await request.text()
        if (new TextEncoder().encode(text).byteLength > 4 * 1024) {
          return json({ error: 'request too large' }, 413)
        }
        body = JSON.parse(text)
      } catch {
        return json({ error: 'invalid readiness match JSON' }, 400)
      }
      if (
        !record(body) ||
        Object.keys(body).some(
          key => key !== 'operationKey' && key !== 'matchNumber'
        ) ||
        Object.keys(body).length !== 2 ||
        typeof body.operationKey !== 'string' ||
        typeof body.matchNumber !== 'number'
      ) {
        return json({ error: 'invalid readiness match request' }, 400)
      }
      try {
        return json({
          match: await createReadinessMatch(
            {
              operationKey: body.operationKey,
              matchNumber: body.matchNumber
            },
            env
          )
        })
      } catch (error) {
        console.error('readiness match creation failed', error)
        return json(
          {
            error:
              error instanceof Error
                ? error.message
                : 'readiness match creation failed'
          },
          error instanceof ReadinessMatchError ? error.status : 502
        )
      }
    }
    if (request.method !== 'POST' || url.pathname !== '/internal/matches') {
      return json({ error: 'not found' }, 404)
    }
    if (!authorized(request, env)) {
      return json({ error: 'not found' }, 404)
    }
    const declaredLength = Number(request.headers.get('content-length') ?? 0)
    if (declaredLength > MAX_DISPATCH_BYTES) {
      return json({ error: 'request too large' }, 413)
    }

    let dispatch
    try {
      const text = await request.text()
      if (new TextEncoder().encode(text).byteLength > MAX_DISPATCH_BYTES) {
        return json({ error: 'request too large' }, 413)
      }
      dispatch = parseAcceptedMatchDispatch(JSON.parse(text), {
        enableRankedBots: explicitlyEnabled(env.ENABLE_RANKED_BOTS)
      })
    } catch (error) {
      return json(
        {
          error:
            error instanceof DispatchProtocolError
              ? error.message
              : 'invalid dispatch JSON'
        },
        400
      )
    }
    if (request.headers.get('idempotency-key') !== dispatch.proposalId) {
      return json({ error: 'idempotency key does not match proposal' }, 400)
    }

    const repository = new MatchRepository(env.AUTH_DB)
    const existing = await repository.findByProposal(dispatch.proposalId)
    const gameModes = dispatch.participants.map(
      participant => participant.player.mode
    ) as [GameMode, GameMode]
    const allocation = {
      proposalId: dispatch.proposalId,
      replayId: existing?.replay_id ?? crypto.randomUUID(),
      mode: legacyMatchMode(gameModes),
      player1Mode: gameModes[0],
      player2Mode: gameModes[1],
      version: dispatch.participants[0].player.clientVersionHash,
      player1Principal: dispatch.participants[0].player.address,
      player2Principal: dispatch.participants[1].player.address,
      player1UserId:
        dispatch.participants[0].identity?.userId ??
        dispatch.participants[0].registeredBot?.userId,
      player2UserId:
        dispatch.participants[1].identity?.userId ??
        dispatch.participants[1].registeredBot?.userId,
      createdAt: new Date(dispatch.createdAtMs).toISOString(),
      dispatchFingerprint: await acceptedMatchFingerprint(dispatch)
    }
    if (existing?.status === 'ended') {
      return json({ error: 'accepted proposal has already ended' }, 409)
    }
    try {
      if (existing) repository.assertAllocationMatches(existing, allocation)
    } catch (error) {
      if (error instanceof MatchPreconditionError) {
        return json({ error: error.message, reason: error.reason }, 409)
      }
      throw error
    }
    try {
      const access = new AccountActionsRepository(env.AUTH_DB)
      await Promise.all(
        dispatch.participants
          .filter(participant => participant.identity !== undefined)
          .map(async participant => {
            const identity = participant.identity!
            if (
              (await deriveGamePrincipal(identity.userId)) !==
              identity.principal
            ) {
              throw new RpcError(
                403,
                'webrpc.permission_denied',
                'identity principal mismatch'
              )
            }
            if (!(await repository.userHasKind(identity.userId, 'PLAYER'))) {
              throw new RpcError(
                403,
                'webrpc.permission_denied',
                'player account is unavailable'
              )
            }
            await access.enforcePlayerAccess(identity.userId)
          })
      )
      const human = dispatch.participants.find(
        participant => participant.identity !== undefined
      )
      for (const participant of dispatch.participants) {
        if (!participant.registeredBot) continue
        if (!human?.identity) {
          throw new RpcError(
            403,
            'webrpc.permission_denied',
            'registered bot opponent is missing'
          )
        }
        await validateRegisteredBotSelection(
          env.AUTH_DB,
          participant.registeredBot,
          human.identity.userId,
          participant.player.mode,
          dispatch.proposalId
        )
      }
    } catch (error) {
      if (error instanceof RpcError && error.status === 403) {
        return json({ error: error.message }, 403)
      }
      if (error instanceof Error && error.message.startsWith('registered bot')) {
        return json({ error: error.message, reason: 'INVALID_ACCOUNT' }, 409)
      }
      throw error
    }
    if (existing?.status === 'active' && existing.server_address) {
      return json({
        proposalId: existing.proposal_id,
        matchId: existing.id,
        serverAddress: existing.server_address
      })
    }

    const enabledModes = await currentEnabledGameModes(env)
    const conquestRepository = new ConquestRepository(env.AUTH_DB)
    const participantModeEnabled = await Promise.all(
      dispatch.participants.map(async participant => {
        const mode = participant.player.mode as GameMode
        if (enabledModes.has(mode)) return true
        if (!CONQUEST_GAME_MODES.some(conquestMode => conquestMode === mode)) {
          return false
        }
        const identity = participant.identity
        return identity
          ? conquestRepository.isDrainable(identity.userId, mode)
          : false
      })
    )
    if (participantModeEnabled.some(value => !value)) {
      return json({ error: 'game mode is disabled' }, 409)
    }

    try {
      let row = existing ?? (await repository.allocateIfMissing(allocation))

      if (!row.match_payload_json) {
        const built = await buildMatch(
          dispatch,
          row.id,
          row.replay_id,
          season(env.CURRENT_SEASON),
          enabled(env.TURN_TIMER_ENABLED),
          repository
        )
        row = await repository.installPayloadIfMissing(
          dispatch.proposalId,
          JSON.stringify({
            proposalId: dispatch.proposalId,
            releaseVersion: row.version,
            match: built.match
          })
        )
      }

      const createRequest = JSON.parse(
        row.match_payload_json
      ) as CreateMatchRequest
      await repository.rejectSupersededAllocation(row)
      const serverAddress = await dispatchToGame(createRequest, env)
      await repository.activate(dispatch.proposalId, serverAddress)
      return json({
        proposalId: dispatch.proposalId,
        matchId: row.id,
        serverAddress
      })
    } catch (error) {
      if (!(error instanceof MatchAllocationConflictError)) {
        await repository.fail(dispatch.proposalId)
      }
      console.error(
        'accepted match creation failed',
        dispatch.proposalId,
        error
      )
      return json(
        {
          error:
            error instanceof Error ? error.message : 'match creation failed',
          ...(error instanceof MatchPreconditionError
            ? { reason: error.reason }
            : {})
        },
        error instanceof DispatchProtocolError
          ? 400
          : error instanceof MatchPreconditionError
            ? 409
            : 502
      )
    }
  }
} satisfies ExportedHandler<MatchServiceEnv>
