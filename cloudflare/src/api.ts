import type { AccountRegistration, DeckClass, ItemType } from '@opensky/proto'

import { AccountsRepository } from './accounts'
import { CookiePoliciesRepository } from './cookie-policies'
import type { Env } from './env'
import { invalidArgument, RpcError } from './errors'
import { signSession } from './jwt'
import {
  currentSeasonStart,
  nextSeasonStart,
  questAutoRerollTimes,
  seasonFromDate,
  seasonName
} from './legacy-seasons'
import { PlayerRpcRepository } from './player-rpc'
import type { VerifiedProof } from './proof'
import { verifySequenceProof } from './proof'
import { rpcPrincipal, type RpcPrincipal } from './rpc-principal'

const RPC_PREFIX = '/api/rpc/SkyWeaverAPI/'

export interface AuthServices {
  verifyProof(
    proofString: string,
    requestOrigin: string | null,
    sequenceApiHost: string
  ): Promise<VerifiedProof>
}

const defaultServices: AuthServices = { verifyProof: verifySequenceProof }

const allowedOrigins = (env: Env) =>
  new Set(env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean))

const responseHeaders = (request: Request, env: Env): Headers => {
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store'
  })
  const origin = request.headers.get('Origin')
  if (origin && allowedOrigins(env).has(origin)) {
    headers.set('Access-Control-Allow-Origin', origin)
    headers.set('Vary', 'Origin')
  }
  return headers
}

const json = (request: Request, env: Env, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: responseHeaders(request, env)
  })

const requestBody = async <T>(request: Request): Promise<T> => {
  try {
    return (await request.json()) as T
  } catch {
    throw invalidArgument('request body must be JSON')
  }
}

const walletPrincipal = async (
  request: Request,
  env: Env
): Promise<Extract<RpcPrincipal, { kind: 'wallet' }>> => {
  const principal = await rpcPrincipal(request, env)
  if (principal.kind !== 'wallet') {
    throw invalidArgument('this method requires a wallet session')
  }
  return principal
}

const identityPrincipal = async (
  request: Request,
  env: Env
): Promise<Extract<RpcPrincipal, { kind: 'identity' }>> => {
  const principal = await rpcPrincipal(request, env)
  if (principal.kind !== 'identity') {
    throw invalidArgument('this player method requires an identity session')
  }
  return principal
}

export const handleApiRequest = async (
  request: Request,
  env: Env,
  services: AuthServices = defaultServices
): Promise<Response> => {
  const url = new URL(request.url)
  if (!url.pathname.startsWith(RPC_PREFIX)) {
    return json(request, env, { code: 'webrpc.not_found', msg: 'RPC method not found' }, 404)
  }

  if (request.method === 'OPTIONS') {
    const headers = responseHeaders(request, env)
    headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, Release')
    headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
    return new Response(null, { status: 204, headers })
  }
  if (request.method !== 'POST') {
    return json(request, env, { code: 'webrpc.method_not_allowed', msg: 'POST required' }, 405)
  }

  const method = url.pathname.slice(RPC_PREFIX.length)
  const accounts = new AccountsRepository(env.AUTH_DB)
  const cookiePolicies = new CookiePoliciesRepository(env.AUTH_DB)
  const playerRpc = new PlayerRpcRepository(env.AUTH_DB)

  try {
    switch (method) {
      case 'GetAuthToken': {
        const body = await requestBody<{ ethAuthProofString?: string }>(request)
        if (!body.ethAuthProofString) throw invalidArgument('ethAuthProofString is required')
        const proof = await services.verifyProof(
          body.ethAuthProofString,
          request.headers.get('Origin'),
          env.SEQUENCE_API_HOST
        )
        const claims = {
          account: proof.address.toLowerCase(),
          app: proof.claims.app,
          iat: proof.claims.iat || Math.floor(Date.now() / 1000),
          exp: proof.claims.exp,
          ...(proof.claims.ogn ? { ogn: proof.claims.ogn } : {})
        }
        const jwtToken = await signSession(claims, env.SESSION_SIGNING_KEY)
        const account = await accounts.findByAddress(proof.address)
        return json(request, env, {
          status: true,
          jwtToken,
          address: proof.address,
          ...(account ? { account } : {})
        })
      }

      case 'GetSession': {
        const principal = await rpcPrincipal(request, env)
        const address = principal.reference
        const account =
          principal.kind === 'identity'
            ? await playerRpc.getAccount(principal.userId, address)
            : await accounts.findByAddress(address)
        return json(request, env, { address, ...(account ? { account } : {}) })
      }

      case 'RegisterAccount': {
        const { reference: address } = await walletPrincipal(request, env)
        const body = await requestBody<{ accountRegistration?: AccountRegistration }>(request)
        if (!body.accountRegistration) throw invalidArgument('accountRegistration is required')
        if (
          body.accountRegistration.address &&
          body.accountRegistration.address.toLowerCase() !== address
        ) {
          throw invalidArgument('account address does not match the session')
        }
        const account = await accounts.register(address, {
          ...body.accountRegistration,
          address
        })
        return json(request, env, { status: true, account })
      }

      case 'GetAccount': {
        const body = await requestBody<{ address?: string }>(request)
        if (!body.address) throw invalidArgument('address is required')
        if (body.address.startsWith('identity:')) {
          const principal = await identityPrincipal(request, env)
          return json(request, env, {
            account: await playerRpc.getAccount(principal.userId, body.address)
          })
        }
        return json(request, env, {
          account: (await accounts.findByAddress(body.address)) || null
        })
      }

      case 'AccountExists': {
        const body = await requestBody<{ address?: string }>(request)
        if (!body.address) throw invalidArgument('address is required')
        const account = await accounts.findByAddress(body.address)
        return json(request, env, { exists: !!account, pending_migration: false })
      }

      case 'AccountExistsByName': {
        const body = await requestBody<{ name?: string }>(request)
        if (!body.name) throw invalidArgument('name is required')
        const account = await accounts.findByName(body.name)
        return json(request, env, { exists: !!account, pending_migration: false })
      }

      case 'GetCookiePolicy': {
        const principal = await rpcPrincipal(request, env)
        return json(request, env, {
          res: await cookiePolicies.get(principal.reference)
        })
      }

      case 'SaveCookiePolicy': {
        const principal = await rpcPrincipal(request, env)
        const body = await requestBody<{ cookieOptions?: Record<string, boolean> }>(request)
        if (!body.cookieOptions || typeof body.cookieOptions !== 'object') {
          throw invalidArgument('cookieOptions is required')
        }
        await cookiePolicies.save(principal.reference, body.cookieOptions)
        return json(request, env, { status: true })
      }

      case 'GetItemOwnershipByType': {
        const principal = await identityPrincipal(request, env)
        const body = await requestBody<{ itemTypes?: ItemType[] }>(request)
        return json(request, env, {
          items: await playerRpc.listItems(principal.userId, body.itemTypes)
        })
      }

      case 'MarkItemsNotNew': {
        const principal = await identityPrincipal(request, env)
        const body = await requestBody<{
          tokenIDs?: number[]
          immediately?: boolean
        }>(request)
        if (!Array.isArray(body.tokenIDs)) {
          throw invalidArgument('tokenIDs is required')
        }
        return json(request, env, {
          ok: await playerRpc.markItemsNotNew(
            principal.userId,
            body.tokenIDs,
            body.immediately === true
          )
        })
      }

      case 'GetCardOwnership': {
        const principal = await identityPrincipal(request, env)
        return json(request, env, {
          res: await playerRpc.cardOwnership(principal.userId)
        })
      }

      case 'GetPendingCards': {
        await identityPrincipal(request, env)
        return json(request, env, { res: [] })
      }

      case 'ListDecks': {
        const principal = await identityPrincipal(request, env)
        return json(request, env, {
          page: { pageSize: 200 },
          res: await playerRpc.listDecks(principal.userId)
        })
      }

      case 'CreateDeck': {
        const principal = await identityPrincipal(request, env)
        const body = await requestBody<{
          req?: {
            name?: string
            class?: DeckClass
            cardIds?: number[]
            art?: string
          }
        }>(request)
        if (!body.req?.name || !Array.isArray(body.req.cardIds)) {
          throw invalidArgument('req.name and req.cardIds are required')
        }
        return json(request, env, {
          res: await playerRpc.createDeck(principal.userId, {
            name: body.req.name,
            class: body.req.class,
            cardIds: body.req.cardIds,
            art: body.req.art
          })
        })
      }

      case 'GetDeck': {
        const principal = await identityPrincipal(request, env)
        const body = await requestBody<{
          req?: { uuid?: string; deckString?: string }
        }>(request)
        if (!body.req) throw invalidArgument('req is required')
        return json(request, env, {
          res: await playerRpc.getDeck(principal.userId, body.req)
        })
      }

      case 'UpdateDeck': {
        const principal = await identityPrincipal(request, env)
        const body = await requestBody<{
          req?: {
            uuid?: string
            deckString?: string
            deck?: {
              deckString?: string
              name?: string
              class?: DeckClass
              art?: string
            }
          }
        }>(request)
        if (
          !body.req?.deck?.deckString ||
          !body.req.deck.name ||
          !body.req.deck.class ||
          (!body.req.uuid && !body.req.deckString)
        ) {
          throw invalidArgument('a selector and complete deck update are required')
        }
        return json(request, env, {
          res: await playerRpc.updateDeck(
            principal.userId,
            { uuid: body.req.uuid, deckString: body.req.deckString },
            {
              deckString: body.req.deck.deckString,
              name: body.req.deck.name,
              class: body.req.deck.class,
              art: body.req.deck.art
            }
          )
        })
      }

      case 'DeleteDeck': {
        const principal = await identityPrincipal(request, env)
        const body = await requestBody<{
          req?: { uuid?: string; deckString?: string }
        }>(request)
        if (!body.req?.uuid && !body.req?.deckString) {
          throw invalidArgument('must provide either uuid or deckString')
        }
        return json(request, env, {
          ok: await playerRpc.deleteDeck(principal.userId, body.req)
        })
      }

      case 'FavoriteDeck':
      case 'UnfavoriteDeck': {
        const principal = await identityPrincipal(request, env)
        const body = await requestBody<{ uuid?: string }>(request)
        if (!body.uuid) throw invalidArgument('uuid is required')
        return json(request, env, {
          ok: await playerRpc.setDeckFavorite(
            principal.userId,
            body.uuid,
            method === 'FavoriteDeck'
          )
        })
      }

      case 'MarkDeckNotNew': {
        const principal = await identityPrincipal(request, env)
        const body = await requestBody<{ uuid?: string }>(request)
        if (!body.uuid) throw invalidArgument('uuid is required')
        return json(request, env, {
          ok: await playerRpc.markDeckNotNew(principal.userId, body.uuid)
        })
      }

      case 'ListUnlockedDeckClasses': {
        await identityPrincipal(request, env)
        return json(request, env, { deckClass: ['STR'] })
      }

      case 'DeckClassUnlockLevels': {
        return json(request, env, {
          res: await playerRpc.deckClassUnlockLevels(seasonFromDate())
        })
      }

      case 'ListQuests': {
        const principal = await identityPrincipal(request, env)
        return json(request, env, {
          quests: await playerRpc.listQuests(principal.userId),
          rewards: []
        })
      }

      case 'SetQuestsAsSeen': {
        const principal = await identityPrincipal(request, env)
        const body = await requestBody<{ ids?: number[] }>(request)
        if (!Array.isArray(body.ids)) throw invalidArgument('ids is required')
        return json(request, env, {
          status: await playerRpc.setQuestsSeen(principal.userId, body.ids)
        })
      }

      case 'ClaimQuestRewards': {
        const principal = await identityPrincipal(request, env)
        const body = await requestBody<{ ids?: number[] }>(request)
        if (!Array.isArray(body.ids)) throw invalidArgument('ids is required')
        return json(
          request,
          env,
          await playerRpc.claimQuestRewards(principal.userId, body.ids)
        )
      }

      case 'GetQuestsAutoRerollTime': {
        return json(request, env, { res: questAutoRerollTimes() })
      }

      case 'GetCurrentSeason': {
        return json(request, env, { res: seasonFromDate() })
      }

      case 'GetCurrentSeasonStartTime': {
        return json(request, env, { res: currentSeasonStart().toISOString() })
      }

      case 'GetNextSeasonTime': {
        return json(request, env, { res: nextSeasonStart().toISOString() })
      }

      case 'ListSkypassRewards': {
        const principal = await identityPrincipal(request, env)
        const body = await requestBody<{ season?: number }>(request)
        const season = body.season || seasonFromDate()
        const { levels, hasPremium } = await playerRpc.listSkypassRewards(
          principal.userId,
          season
        )
        return json(request, env, {
          res: {
            levels,
            seasonNumber: season,
            seasonName: seasonName(season),
            hasPremium
          }
        })
      }

      case 'ClaimSkypassRewards': {
        const principal = await identityPrincipal(request, env)
        const body = await requestBody<{ ids?: number[] }>(request)
        if (!Array.isArray(body.ids)) throw invalidArgument('ids is required')
        return json(request, env, {
          rewards: await playerRpc.claimSkypassRewards(
            principal.userId,
            body.ids
          )
        })
      }

      default:
        return json(request, env, { code: 'webrpc.not_found', msg: 'RPC method not found' }, 404)
    }
  } catch (error) {
    if (error instanceof RpcError) {
      return json(request, env, { code: error.code, msg: error.message, status: error.status }, error.status)
    }
    console.error('Cloudflare auth RPC error', error)
    return json(
      request,
      env,
      { code: 'webrpc.internal', msg: 'internal server error', status: 500 },
      500
    )
  }
}
