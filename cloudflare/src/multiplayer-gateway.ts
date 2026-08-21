import { deriveGamePrincipal } from '@opensky/shared/game-principal'
import { CLOUDFLARE_MATCHMAKER_POOL_NAME } from '@opensky/shared/cloudflare-multiplayer'
import { storedMatchModes } from '@opensky/shared/match-modes'
import type { GameMode } from '@opensky/proto'

import { readCookies } from './cookies'
import type { Env } from './env'
import {
  IDENTITY_SESSION_COOKIE,
  verifyIdentitySession
} from './identity-session'
import { IdentitiesRepository } from './identities'
import { AccountActionsRepository } from './account-actions'
import { RpcError } from './errors'

export const INTERNAL_AUTH_HEADER = 'x-cloud-weasel-internal-auth'
const TRUSTED_PRINCIPAL_HEADER = 'x-cloud-weasel-principal'
const TRUSTED_USER_ID_HEADER = 'x-cloud-weasel-user-id'
const TRUSTED_DISPLAY_NAME_HEADER = 'x-cloud-weasel-display-name'
const TRUSTED_CLIENT_IP_HEADER = 'x-cloud-weasel-client-ip'
const TRUSTED_ANONYMOUS_SPECTATOR_HEADER =
  'x-cloud-weasel-anonymous-spectator'
const MATCH_INFO_PREFIX = '/api/matchmaker/matchinfo/'

interface MatchInfoRow {
  id: number
  proposal_id: string
  mode: string
  player1_mode: GameMode | null
  player2_mode: GameMode | null
  player1_principal: string
  player2_principal: string
  version: string
  match_payload_json: string
  server_address: string | null
  status: 'creating' | 'active'
}

interface RecentMatchRow {
  proposal_id: string
  status: string
  result_json: string | null
  ended_at: string | null
}

interface MatchRuntimeStatus {
  initialized?: unknown
  proposalId?: unknown
  ended?: unknown
  players?: unknown
  timers?: unknown
}

const RECENT_MATCH_EXPIRY_MS = 24 * 60 * 60 * 1_000

const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const remainingMatchTimeoutSeconds = (
  status: MatchRuntimeStatus,
  proposalId: string,
  principal: string,
  now: number
) => {
  if (
    status.initialized !== true ||
    status.proposalId !== proposalId ||
    status.ended === true ||
    !record(status.players) ||
    !record(status.timers)
  ) {
    return 0
  }
  const player = status.players[principal.toLowerCase()]
  if (!record(player)) return 0

  const deadlines: number[] = []
  const loadExpiryAtMs = status.timers.loadExpiryAtMs
  if (
    player.finishedLoadingAssets === false &&
    typeof loadExpiryAtMs === 'number' &&
    Number.isSafeInteger(loadExpiryAtMs) &&
    loadExpiryAtMs > now
  ) {
    deadlines.push(loadExpiryAtMs)
  }
  const abandonAtMs = player.abandonAtMs
  if (
    typeof abandonAtMs === 'number' &&
    Number.isSafeInteger(abandonAtMs) &&
    abandonAtMs > now
  ) {
    deadlines.push(abandonAtMs)
  }
  return deadlines.length === 0
    ? 0
    : Math.floor((Math.min(...deadlines) - now) / 1_000)
}

const matchDisconnectTimeout = async (
  env: Env,
  row: MatchInfoRow,
  principal: string
) => {
  try {
    const response = await env.GAME_MATCHES.getByName(
      `match:${row.proposal_id}`
    ).fetch(
      new Request('https://game-match/internal/status?scope=match-info', {
        headers: { [INTERNAL_AUTH_HEADER]: env.INTERNAL_AUTH_SECRET }
      })
    )
    if (!response.ok) return 0
    const status = (await response.json()) as MatchRuntimeStatus
    return remainingMatchTimeoutSeconds(
      status,
      row.proposal_id,
      principal,
      Date.now()
    )
  } catch (error) {
    console.error('match timeout lookup failed', row.proposal_id, error)
    return 0
  }
}

const json = (body: unknown, status: number) =>
  Response.json(body, {
    status,
    headers: {
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff'
    }
  })

const identity = async (request: Request, env: Env) => {
  const token = readCookies(request).get(IDENTITY_SESSION_COOKIE)
  if (!token) return
  const userId = await verifyIdentitySession(token, env.SESSION_SIGNING_KEY)
  if (!userId) return
  await new AccountActionsRepository(env.AUTH_DB).enforcePlayerAccess(userId)
  const user = await new IdentitiesRepository(env.AUTH_DB).findUserById(userId)
  if (!user) return
  return { user, principal: await deriveGamePrincipal(userId) }
}

const trustedRequest = (
  request: Request,
  userId: string,
  displayName: string,
  principal: string,
  env: Env,
  anonymousSpectator = false
) => {
  const headers = new Headers(request.headers)
  headers.delete('authorization')
  headers.delete('cookie')
  headers.set(INTERNAL_AUTH_HEADER, env.INTERNAL_AUTH_SECRET)
  headers.set(TRUSTED_PRINCIPAL_HEADER, principal)
  headers.set(TRUSTED_USER_ID_HEADER, userId)
  headers.set(TRUSTED_DISPLAY_NAME_HEADER, displayName.slice(0, 256))
  if (anonymousSpectator) {
    headers.set(TRUSTED_ANONYMOUS_SPECTATOR_HEADER, '1')
  } else {
    headers.delete(TRUSTED_ANONYMOUS_SPECTATOR_HEADER)
  }
  headers.set(
    TRUSTED_CLIENT_IP_HEADER,
    (request.headers.get('CF-Connecting-IP') ?? '').slice(0, 128)
  )
  // Preserve Cloudflare's internal WebSocket upgrade metadata. Rebuilding the
  // request from a URL retains visible headers but can detach the response-side
  // socket when the request crosses into a Durable Object namespace.
  return new Request(request, { headers })
}

const currentMatchFor = (env: Env, principal: string) =>
  env.AUTH_DB.prepare(
    `SELECT id, proposal_id, mode, player1_mode, player2_mode,
            version, match_payload_json, server_address, status,
            player1_principal, player2_principal
     FROM multiplayer_matches
     WHERE (status = 'creating'
         OR (status = 'active' AND server_address IS NOT NULL))
       AND (player1_principal = ? OR player2_principal = ?)
     ORDER BY id DESC
     LIMIT 1`
  )
    .bind(principal, principal)
    .first<MatchInfoRow>()

const recentMatchFor = (env: Env, principal: string) =>
  env.AUTH_DB.prepare(
    `SELECT proposal_id, status, result_json, ended_at
     FROM multiplayer_matches
     WHERE player1_principal = ? OR player2_principal = ?
     ORDER BY id DESC
     LIMIT 1`
  )
    .bind(principal, principal)
    .first<RecentMatchRow>()

const validRecentMatchInfo = (
  value: unknown,
  principal: string
): value is Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const info = value as Record<string, unknown>
  const conquestInfo = info.conquestInfo
  const hasValidConquestInfo =
    conquestInfo === undefined ||
    (Array.isArray(conquestInfo) &&
      conquestInfo.length === 2 &&
      conquestInfo.every(validStoredConquest))
  const conquestMode =
    info.gameMode === 'CONQUEST_CONSTRUCTED' ||
    info.gameMode === 'CONQUEST_DISCOVERY'
  return (
    info.type === 'recent_match_info' &&
    typeof info.playerID === 'string' &&
    info.playerID.toLowerCase() === principal.toLowerCase() &&
    Number.isSafeInteger(info.matchID) &&
    typeof info.replayID === 'string' &&
    typeof info.gameMode === 'string' &&
    Array.isArray(info.accounts) &&
    info.accounts.length === 2 &&
    typeof info.store === 'string' &&
    /^0x(?:[0-9a-f]{2})+$/i.test(info.store) &&
    Array.isArray(info.rewards) &&
    hasValidConquestInfo &&
    (!conquestMode || conquestInfo !== undefined)
  )
}

const optionalSourceUint = (value: unknown) =>
  value === undefined ||
  (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0)

const optionalSourceString = (value: unknown) =>
  value === undefined || typeof value === 'string'

const optionalSourceNullableString = (value: unknown) =>
  value === undefined || value === null || typeof value === 'string'

const validStoredConquest = (value: unknown) =>
  record(value) &&
  optionalSourceUint(value.id) &&
  optionalSourceString(value.status) &&
  optionalSourceUint(value.nonce) &&
  optionalSourceString(value.mode) &&
  optionalSourceString(value.hero) &&
  optionalSourceNullableString(value.deckClass) &&
  (value.matchProgress === undefined ||
    value.matchProgress === null ||
    record(value.matchProgress)) &&
  optionalSourceNullableString(value.createdAt) &&
  optionalSourceNullableString(value.endedAt)

const sourceConquest = (value: unknown) => {
  const conquest = record(value) ? value : {}
  return {
    id: conquest.id ?? 0,
    status: conquest.status ?? 'UNKNOWN',
    nonce: conquest.nonce ?? 0,
    mode: conquest.mode ?? 'UNKNOWN',
    hero: conquest.hero ?? 'UNKNOWN',
    deckClass: conquest.deckClass ?? null,
    matchProgress: conquest.matchProgress ?? null,
    createdAt: conquest.createdAt ?? null,
    endedAt: conquest.endedAt ?? null
  }
}

const publicRecentMatchInfo = (info: Record<string, unknown>) => {
  const conquestInfo = Array.isArray(info.conquestInfo)
    ? info.conquestInfo
    : [undefined, undefined]
  return {
    ...info,
    // Go decodes the game server's optional value into [2]proto.Conquest and
    // re-serializes every field, including zero/null defaults.
    conquestInfo: conquestInfo.map(sourceConquest)
  }
}

const recentMatchInfo = async (env: Env, principal: string) => {
  const row = await recentMatchFor(env, principal)
  if (
    !row ||
    row.status !== 'ended' ||
    !row.ended_at ||
    Date.parse(row.ended_at) < Date.now() - RECENT_MATCH_EXPIRY_MS
  ) {
    return json({ type: 'no_match_found' }, 200)
  }
  try {
    const result = row.result_json
      ? (JSON.parse(row.result_json) as { reason?: unknown })
      : undefined
    if (result?.reason === 'players_did_not_load') {
      return json({ type: 'no_match_found' }, 200)
    }
  } catch {
    return json({ type: 'no_match_found' }, 200)
  }
  try {
    const response = await env.GAME_MATCHES.getByName(
      `match:${row.proposal_id}`
    ).fetch(
      new Request('https://game-match/internal/recent-match-info', {
        headers: {
          [INTERNAL_AUTH_HEADER]: env.INTERNAL_AUTH_SECRET,
          [TRUSTED_PRINCIPAL_HEADER]: principal
        }
      })
    )
    if (response.status === 404)
      return json({ type: 'no_match_found' }, 200)
    if (!response.ok) {
      throw new Error(`game server returned ${response.status}`)
    }
    const info: unknown = await response.json()
    if (!validRecentMatchInfo(info, principal)) {
      throw new Error('game server returned invalid recent match info')
    }
    return json(publicRecentMatchInfo(info), 200)
  } catch (error) {
    console.error('recent match recovery failed', row.proposal_id, error)
    return json(
      { type: 'error', level: 'server', message: 'Recent match is unavailable.' },
      500
    )
  }
}

const matchInfo = async (
  request: Request,
  env: Env,
  principal: string,
  requesterPrincipal?: string
) => {
  const row = await currentMatchFor(env, principal)
  if (!row) {
    // Recent payloads contain the player's private final store and rewards.
    // Active-match lookup remains available to authenticated spectators, but
    // ended-match recovery is only returned to that participant.
    return principal === requesterPrincipal
      ? recentMatchInfo(env, principal)
      : json({ type: 'no_match_found' }, 200)
  }

  try {
    const initialized = row.status === 'active'
    let playerIDs = [
      row.player1_principal.toLowerCase(),
      row.player2_principal.toLowerCase()
    ]
    if (initialized) {
      const payload = JSON.parse(row.match_payload_json) as {
        match?: {
          player1?: { account?: { address?: unknown } }
          player2?: { account?: { address?: unknown } }
        }
      }
      const payloadPlayerIDs = [
        payload.match?.player1?.account?.address,
        payload.match?.player2?.account?.address
      ]
      if (payloadPlayerIDs.some(address => typeof address !== 'string')) {
        throw new Error('match payload is missing player addresses')
      }
      playerIDs = payloadPlayerIDs as string[]
    }

    let serverAddress = row.server_address
    if (!serverAddress) {
      const pendingAddress = new URL(
        `/api/game/matches/${encodeURIComponent(row.proposal_id)}`,
        request.url
      )
      pendingAddress.protocol =
        pendingAddress.protocol === 'https:' ? 'wss:' : 'ws:'
      serverAddress = pendingAddress.href
    }
    const websocket = new URL(serverAddress)
    // The immutable client release negotiated by the matcher is authoritative
    // for reconnects. A deployment-wide override can point an older active
    // match at assets built for a different state/protocol version.
    const releaseVersion = row.version || 'cloud-weasel'
    const modes = storedMatchModes({
      mode: row.mode as GameMode,
      player1_mode: row.player1_mode,
      player2_mode: row.player2_mode
    })
    const disconnectTimeout = await matchDisconnectTimeout(env, row, principal)
    return json(
      {
        type: 'in_progress_match_info',
        matchInfo: {
          id: row.id,
          mode:
            row.player1_principal.toLowerCase() === principal.toLowerCase()
              ? modes[0]
              : modes[1],
          playerIDs,
          serverLocationKey: `match:${row.proposal_id}`,
          version: releaseVersion,
          initialized
        },
        serverInfo: {
          status: 'online',
          name: 'cloud-weasel-game-server',
          hostname: websocket.hostname,
          port:
            Number(websocket.port) ||
            (websocket.protocol === 'wss:' ? 443 : 80),
          ws: serverAddress,
          http: serverAddress
            .replace(/^wss:/, 'https:')
            .replace(/^ws:/, 'http:'),
          load: {
            inProgressMatches: 1,
            maxCapacity: 1,
            completedMatches: 0
          },
          releaseVersion
        },
        // The Go matchmaker reports the minimum remaining per-player loading
        // and disconnect TTL in whole seconds, or zero when neither applies.
        disconnectTimeout
      },
      200
    )
  } catch (error) {
    console.error('invalid active match record', row.proposal_id, error)
    return json(
      { type: 'error', level: 'server', message: 'Match record is invalid.' },
      500
    )
  }
}

const anonymousSpectator = () => {
  const principalBytes = crypto.getRandomValues(new Uint8Array(20))
  const principal = `0x${Array.from(principalBytes, byte =>
    byte.toString(16).padStart(2, '0')
  ).join('')}`
  const userId = `anonymous-${crypto.randomUUID()}`
  return { userId, displayName: userId, principal }
}

const matchInfoPrincipal = async (
  env: Env,
  requestedTarget: string
): Promise<string | undefined> => {
  let target: string
  try {
    target = decodeURIComponent(requestedTarget)
  } catch {
    return
  }
  if (/^0x[0-9a-f]{40}$/i.test(target)) return target.toLowerCase()
  if (!target.startsWith('identity:')) return
  const userId = target.slice('identity:'.length)
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(userId)) return
  const user = await new IdentitiesRepository(env.AUTH_DB).findUserById(userId)
  return user ? deriveGamePrincipal(userId) : undefined
}

export const handleMultiplayerGateway = async (
  request: Request,
  env: Env
): Promise<Response> => {
  let authenticated
  try {
    authenticated = await identity(request, env)
  } catch (error) {
    if (!(error instanceof RpcError) || error.status !== 403) throw error
    return json(
      { error: error instanceof Error ? error.message : 'account banned' },
      403
    )
  }
  const url = new URL(request.url)

  if (request.method === 'GET' && url.pathname.startsWith(MATCH_INFO_PREFIX)) {
    const principal = await matchInfoPrincipal(
      env,
      url.pathname.slice(MATCH_INFO_PREFIX.length)
    )
    return principal
      ? matchInfo(request, env, principal, authenticated?.principal)
      : json({ type: 'no_match_found' }, 200)
  }
  if (
    authenticated &&
    request.headers.get('Upgrade')?.toLowerCase() !== 'websocket'
  ) {
    return json({ error: 'websocket upgrade required' }, 426)
  }
  if (
    url.pathname === '/api/matchmaker' ||
    url.pathname === '/api/matchmaker/'
  ) {
    if (!authenticated) return json({ error: 'authentication required' }, 401)
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return json({ error: 'websocket upgrade required' }, 426)
    }
    return env.MATCHMAKER_POOLS.getByName(
      CLOUDFLARE_MATCHMAKER_POOL_NAME
    ).fetch(
      trustedRequest(
        request,
        authenticated.user.id,
        authenticated.user.displayName,
        authenticated.principal,
        env
      )
    )
  }
  if (url.pathname.startsWith('/api/game/matches/')) {
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return json({ error: 'websocket upgrade required' }, 426)
    }
    const proposal = url.pathname.slice('/api/game/matches/'.length)
    if (!/^[a-zA-Z0-9_-]{1,128}$/.test(proposal)) {
      return json({ error: 'invalid match ID' }, 400)
    }
    const spectator = authenticated
      ? {
          userId: authenticated.user.id,
          displayName: authenticated.user.displayName,
          principal: authenticated.principal,
          anonymous: false
        }
      : { ...anonymousSpectator(), anonymous: true }
    return env.GAME_MATCHES.getByName(`match:${proposal}`).fetch(
      trustedRequest(
        request,
        spectator.userId,
        spectator.displayName,
        spectator.principal,
        env,
        spectator.anonymous
      )
    )
  }
  return authenticated
    ? json({ error: 'not found' }, 404)
    : json({ error: 'authentication required' }, 401)
}
