import type { Match } from '@opensky/proto'

import { CompetitiveRepository } from './competitive'
import type { Env } from './env'
import { invalidArgument, notFound } from './errors'
import { INTERNAL_AUTH_HEADER } from './multiplayer-gateway'

const REPLAY_PATH = '/api/replays/'
const MAX_REPLAY_RECORDS = 10_000

interface ReplayTarget {
  match: Match
  proposalId: string
  inProgress: boolean
  startedAt: string
}

const target = async (
  env: Env,
  matchId: number,
  replayId: string
): Promise<ReplayTarget> => {
  if (!Number.isSafeInteger(matchId) || matchId < 1) {
    throw invalidArgument('matchID is invalid')
  }
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(replayId)) {
    throw notFound('match with this replay ID not found')
  }
  const found = await new CompetitiveRepository(env.AUTH_DB).matchByReplay(
    matchId,
    replayId
  )
  if (!found) throw notFound('match with this replay ID not found')
  return found
}

const internalRequest = (env: Env, path: string) =>
  new Request(`https://game-match${path}`, {
    headers: { [INTERNAL_AUTH_HEADER]: env.INTERNAL_AUTH_SECRET }
  })

export const replayArchive = async (
  request: Request,
  env: Env,
  matchId: number,
  replayId: string
) => {
  const found = await target(env, matchId, replayId)
  if (
    found.inProgress &&
    Date.parse(found.startedAt) + 120 * 60 * 1000 > Date.now()
  ) {
    throw invalidArgument('match is still in-progress')
  }
  const stub = env.GAME_MATCHES.getByName(`match:${found.proposalId}`)
  const response = await stub.fetch(
    internalRequest(env, '/internal/replay-index')
  )
  if (!response.ok) throw notFound('match replay records were not found')
  const body = (await response.json()) as { indexes?: unknown }
  if (
    !Array.isArray(body.indexes) ||
    body.indexes.length < 1 ||
    body.indexes.length > MAX_REPLAY_RECORDS ||
    body.indexes.some(
      index => !Number.isSafeInteger(index) || index < 0 || index > 999_999
    )
  ) {
    throw notFound('match replay records were not found')
  }
  const origin = new URL(request.url).origin
  const base = `${origin}${REPLAY_PATH}${matchId}/${encodeURIComponent(replayId)}`
  return {
    ok: true,
    match: found.match,
    archiveIndexURI: '',
    recordURIs: body.indexes.map(index => `${base}/${index}`)
  }
}

export const handleReplayRequest = async (request: Request, env: Env) => {
  if (request.method !== 'GET')
    return Response.json({ error: 'GET required' }, { status: 405 })
  const pathname = new URL(request.url).pathname
  const parts = pathname.slice(REPLAY_PATH.length).split('/')
  if (parts.length !== 3) return new Response('Not found', { status: 404 })
  let replayId: string
  try {
    replayId = decodeURIComponent(parts[1])
  } catch {
    return new Response('Not found', { status: 404 })
  }
  const matchId = Number(parts[0])
  const index = Number(parts[2])
  try {
    const found = await target(env, matchId, replayId)
    if (!Number.isSafeInteger(index) || index < 0 || index > 999_999) {
      return new Response('Not found', { status: 404 })
    }
    const response = await env.GAME_MATCHES.getByName(
      `match:${found.proposalId}`
    ).fetch(internalRequest(env, `/internal/replay/${index}`))
    if (!response.ok) return new Response('Not found', { status: 404 })
    return new Response(response.body, {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'cache-control': 'private, max-age=3600',
        'x-content-type-options': 'nosniff'
      }
    })
  } catch {
    return new Response('Not found', { status: 404 })
  }
}
