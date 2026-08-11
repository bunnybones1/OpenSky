import { GameMode } from '@opensky/proto'
import { deriveGamePrincipal } from '@opensky/shared/game-principal'
import { MatchmakerStartMatchMessage } from '@opensky/shared/matchmaker-message-types'

import { buildMatch } from './match-builder'
import {
  DispatchProtocolError,
  INTERNAL_AUTH_HEADER,
  MAX_DISPATCH_BYTES,
  parseAcceptedMatchDispatch
} from './protocol'
import { MatchRepository } from './repository'

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
  if (!value) return DEFAULT_ENABLED_GAME_MODES
  const supported = new Set(Object.values(GameMode))
  return new Set(
    value
      .split(',')
      .map(mode => mode.trim())
      .filter((mode): mode is GameMode => supported.has(mode as GameMode))
  )
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
  if (declaredLength > 4 * 1024) return json({ error: 'request too large' }, 413)

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
    !modes.has(body.mode as GameMode)
  ) {
    return json({ error: 'invalid profile request' }, 400)
  }

  if ((await deriveGamePrincipal(body.userId)) !== body.principal) {
    return json({ error: 'identity principal mismatch' }, 403)
  }

  try {
    const repository = new MatchRepository(env.AUTH_DB)
    const profile = await repository.matchmakingProfile(
      body.userId,
      body.principal,
      body.mode as GameMode,
      season(env.CURRENT_SEASON)
    )
    const requiresRankedExperience = [
      GameMode.RANKED_CONSTRUCTED,
      GameMode.RANKED_DISCOVERY
    ].includes(body.mode as GameMode)
    return json({
      gameModeEnabled:
        enabledGameModes(env.ENABLED_GAME_MODES).has(body.mode as GameMode) &&
        (!requiresRankedExperience || profile.rankedEligible),
      profile
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'player was not found') {
      return json({ error: error.message }, 404)
    }
    console.error('matchmaking profile failed', error)
    return json({ error: 'matchmaking profile failed' }, 500)
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
    if (
      request.method === 'POST' &&
      url.pathname === '/internal/matchmaker/player-profile'
    ) {
      if (!authorized(request, env)) return json({ error: 'not found' }, 404)
      return matchmakingProfile(request, env)
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
      dispatch = parseAcceptedMatchDispatch(JSON.parse(text))
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
    if (existing?.status === 'active' && existing.server_address) {
      return json({
        proposalId: existing.proposal_id,
        matchId: existing.id,
        serverAddress: existing.server_address
      })
    }
    if (existing?.status === 'ended') {
      return json({ error: 'accepted proposal has already ended' }, 409)
    }

    try {
      const replayId = existing?.replay_id ?? crypto.randomUUID()
      let row =
        existing ??
        (await repository.allocateIfMissing({
          proposalId: dispatch.proposalId,
          replayId,
          mode: dispatch.participants[0].player.mode,
          version: dispatch.participants[0].player.clientVersionHash,
          player1Principal: dispatch.participants[0].player.address,
          player2Principal: dispatch.participants[1].player.address,
          player1UserId: dispatch.participants[0].identity?.userId,
          player2UserId: dispatch.participants[1].identity?.userId,
          createdAt: new Date(dispatch.createdAtMs).toISOString()
        }))

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
      const serverAddress = await dispatchToGame(createRequest, env)
      await repository.activate(dispatch.proposalId, serverAddress)
      return json({
        proposalId: dispatch.proposalId,
        matchId: row.id,
        serverAddress
      })
    } catch (error) {
      await repository.fail(dispatch.proposalId)
      console.error(
        'accepted match creation failed',
        dispatch.proposalId,
        error
      )
      return json(
        {
          error:
            error instanceof Error ? error.message : 'match creation failed'
        },
        error instanceof DispatchProtocolError ? 400 : 502
      )
    }
  }
} satisfies ExportedHandler<MatchServiceEnv>
