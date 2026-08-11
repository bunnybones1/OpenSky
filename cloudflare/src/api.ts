import type {
  Account,
  AccountRegistration,
  DeckClass,
  ItemType
} from '@opensky/proto'
import { deriveGamePrincipal } from '@opensky/shared/game-principal'

import { AccountsRepository } from './accounts'
import { BotMatchRepository, type BotMatchEndRequest } from './bot-match'
import { CookiePoliciesRepository } from './cookie-policies'
import { CompetitiveRepository } from './competitive'
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
import {
  identityReferenceFor,
  optionalRpcPrincipal,
  rpcPrincipal,
  type RpcPrincipal
} from './rpc-principal'
import { UserStorageRepository } from './user-storage'

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
  new Set(
    env.ALLOWED_ORIGINS.split(',')
      .map(origin => origin.trim())
      .filter(Boolean)
  )

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

const userStorageKey = (value: unknown): string => {
  if (typeof value !== 'string' || value.length < 1 || value.length > 128) {
    throw invalidArgument('user storage key must contain 1 to 128 characters')
  }
  return value.toLowerCase()
}

const userStorageJson = (value: unknown): string => {
  const jsonValue = JSON.stringify(value)
  if (
    jsonValue === undefined ||
    new TextEncoder().encode(jsonValue).byteLength > 256 * 1024
  ) {
    throw invalidArgument('user storage object is invalid or too large')
  }
  return jsonValue
}

export const handleApiRequest = async (
  request: Request,
  env: Env,
  services: AuthServices = defaultServices
): Promise<Response> => {
  const url = new URL(request.url)
  if (!url.pathname.startsWith(RPC_PREFIX)) {
    return json(
      request,
      env,
      { code: 'webrpc.not_found', msg: 'RPC method not found' },
      404
    )
  }

  if (request.method === 'OPTIONS') {
    const headers = responseHeaders(request, env)
    headers.set(
      'Access-Control-Allow-Headers',
      'Authorization, Content-Type, Release'
    )
    headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
    return new Response(null, { status: 204, headers })
  }
  if (request.method !== 'POST') {
    return json(
      request,
      env,
      { code: 'webrpc.method_not_allowed', msg: 'POST required' },
      405
    )
  }

  const method = url.pathname.slice(RPC_PREFIX.length)
  const accounts = new AccountsRepository(env.AUTH_DB)
  const cookiePolicies = new CookiePoliciesRepository(env.AUTH_DB)
  const competitive = new CompetitiveRepository(env.AUTH_DB)
  const playerRpc = new PlayerRpcRepository(env.AUTH_DB)
  const userStorage = new UserStorageRepository(env.AUTH_DB)
  const botMatches = new BotMatchRepository(env.AUTH_DB)

  try {
    switch (method) {
      case 'GetAuthToken': {
        const body = await requestBody<{ ethAuthProofString?: string }>(request)
        if (!body.ethAuthProofString)
          throw invalidArgument('ethAuthProofString is required')
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
        return json(request, env, {
          address,
          ...(account ? { account } : {}),
          ...(principal.kind === 'identity'
            ? { gamePrincipal: await deriveGamePrincipal(principal.userId) }
            : {})
        })
      }

      case 'RegisterAccount': {
        const { reference: address } = await walletPrincipal(request, env)
        const body = await requestBody<{
          accountRegistration?: AccountRegistration
        }>(request)
        if (!body.accountRegistration)
          throw invalidArgument('accountRegistration is required')
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
          const principal = await optionalRpcPrincipal(request, env)
          return json(request, env, {
            account: await playerRpc.getAccountByReference(
              body.address,
              principal?.kind === 'identity' ? principal.userId : undefined
            )
          })
        }
        return json(request, env, {
          account: (await accounts.findByAddress(body.address)) || null
        })
      }

      case 'AccountExists': {
        const body = await requestBody<{ address?: string }>(request)
        if (!body.address) throw invalidArgument('address is required')
        const exists = body.address.startsWith('identity:')
          ? await playerRpc.accountReferenceExists(body.address)
          : !!(await accounts.findByAddress(body.address))
        return json(request, env, {
          exists,
          pending_migration: false
        })
      }

      case 'AccountExistsByName': {
        const body = await requestBody<{ name?: string }>(request)
        if (!body.name) throw invalidArgument('name is required')
        const exists =
          !!(await accounts.findByName(body.name)) ||
          (await playerRpc.accountNameExists(body.name))
        return json(request, env, {
          exists,
          pending_migration: false
        })
      }

      case 'UpdateAccount': {
        const principal = await identityPrincipal(request, env)
        const body = await requestBody<{
          account?: Partial<Account> & { address?: string }
        }>(request)
        if (!body.account?.address) {
          throw invalidArgument('account.address is required')
        }
        return json(request, env, {
          account: await playerRpc.updateAccount(principal.userId, {
            ...body.account,
            address: body.account.address
          })
        })
      }

      case 'GetAccountStats': {
        const body = await requestBody<{
          address?: string
          seasons?: number[]
        }>(request)
        if (!body.address) throw invalidArgument('address is required')
        const result = await competitive.accountStats(
          body.address,
          body.seasons
        )
        if (!result) throw invalidArgument('account was not found')
        return json(request, env, result)
      }

      case 'ListLeaderboard': {
        const body = await requestBody<{
          page?: import('@opensky/proto').Page
          req?: import('./competitive').LeaderboardRequest
        }>(request)
        if (!body.req) throw invalidArgument('req is required')
        return json(
          request,
          env,
          await competitive.listLeaderboard(body.page, body.req)
        )
      }

      case 'AccountLeaderboard': {
        const principal = await identityPrincipal(request, env)
        const body = await requestBody<{
          page?: import('@opensky/proto').Page
          req?: import('./competitive').LeaderboardRequest & {
            accountAddress?: string
          }
        }>(request)
        if (!body.req) throw invalidArgument('req is required')
        const accountAddress =
          body.req.accountAddress || identityReferenceFor(principal.userId)
        return json(
          request,
          env,
          await competitive.accountLeaderboard(body.page, {
            ...body.req,
            accountAddress
          })
        )
      }

      case 'ListMatches': {
        const principal = await identityPrincipal(request, env)
        const body = await requestBody<{
          page?: import('@opensky/proto').Page
          req?: { accountAddress?: string }
        }>(request)
        return json(
          request,
          env,
          await competitive.listMatches(
            principal.userId,
            body.page,
            body.req?.accountAddress
          )
        )
      }

      case 'GetCookiePolicy': {
        const principal = await rpcPrincipal(request, env)
        return json(request, env, {
          res: await cookiePolicies.get(principal.reference)
        })
      }

      case 'SaveCookiePolicy': {
        const principal = await rpcPrincipal(request, env)
        const body = await requestBody<{
          cookieOptions?: Record<string, boolean>
        }>(request)
        if (!body.cookieOptions || typeof body.cookieOptions !== 'object') {
          throw invalidArgument('cookieOptions is required')
        }
        await cookiePolicies.save(principal.reference, body.cookieOptions)
        return json(request, env, { status: true })
      }

      case 'UserStorageFetch': {
        const principal = await rpcPrincipal(request, env)
        const body = await requestBody<{ key?: unknown }>(request)
        return json(request, env, {
          object: await userStorage.fetch(
            principal.reference,
            userStorageKey(body.key)
          )
        })
      }

      case 'UserStorageSave': {
        const principal = await rpcPrincipal(request, env)
        const body = await requestBody<{ key?: unknown; object?: unknown }>(
          request
        )
        if (!Object.prototype.hasOwnProperty.call(body, 'object')) {
          throw invalidArgument('user storage object is required')
        }
        await userStorage.save(
          principal.reference,
          userStorageKey(body.key),
          userStorageJson(body.object)
        )
        return json(request, env, { ok: true })
      }

      case 'UserStorageDelete': {
        const principal = await rpcPrincipal(request, env)
        const body = await requestBody<{ key?: unknown }>(request)
        await userStorage.delete(principal.reference, userStorageKey(body.key))
        return json(request, env, { ok: true })
      }

      case 'UserStorageFetchAll': {
        const principal = await rpcPrincipal(request, env)
        const body = await requestBody<{ keys?: unknown }>(request)
        if (
          body.keys !== undefined &&
          (!Array.isArray(body.keys) || body.keys.length > 128)
        ) {
          throw invalidArgument(
            'user storage keys must be an array of at most 128 keys'
          )
        }
        const keys = Array.isArray(body.keys)
          ? [...new Set(body.keys.map(userStorageKey))]
          : []
        const entries = await userStorage.fetchAll(principal.reference, keys)
        return json(request, env, {
          objects: Object.fromEntries(
            entries.map(entry => [entry.key, entry.object])
          )
        })
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

      case 'EquipItem': {
        const principal = await identityPrincipal(request, env)
        const body = await requestBody<{
          itemType?: ItemType
          tokenID?: number
        }>(request)
        if (!body.itemType) throw invalidArgument('itemType is required')
        if (!Number.isSafeInteger(body.tokenID) || (body.tokenID ?? -1) < 0) {
          throw invalidArgument('tokenID must be a non-negative integer')
        }
        return json(request, env, {
          item: await playerRpc.equipItem(
            principal.userId,
            body.itemType,
            body.tokenID!
          )
        })
      }

      case 'UnequipItem': {
        const principal = await identityPrincipal(request, env)
        const body = await requestBody<{
          itemType?: ItemType
          tokenID?: number
        }>(request)
        if (!body.itemType) throw invalidArgument('itemType is required')
        if (!Number.isSafeInteger(body.tokenID) || (body.tokenID ?? -1) < 0) {
          throw invalidArgument('tokenID must be a non-negative integer')
        }
        return json(request, env, {
          ok: await playerRpc.unequipItem(
            principal.userId,
            body.itemType,
            body.tokenID!
          )
        })
      }

      case 'ListEquippedItems': {
        const principal = await identityPrincipal(request, env)
        const body = await requestBody<{ itemType?: ItemType }>(request)
        return json(request, env, {
          items: await playerRpc.listEquippedItems(
            principal.userId,
            body.itemType
          )
        })
      }

      case 'GetDeckEquipmentByDeckString': {
        const principal = await identityPrincipal(request, env)
        const body = await requestBody<{ deckString?: string }>(request)
        if (!body.deckString) throw invalidArgument('deckString is required')
        return json(request, env, {
          deckEquipment: await playerRpc.deckEquipment(
            principal.userId,
            body.deckString
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
          throw invalidArgument(
            'a selector and complete deck update are required'
          )
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

      case 'BotMatchEnd': {
        const principal = await identityPrincipal(request, env)
        const body = await requestBody<{ req?: BotMatchEndRequest }>(request)
        if (!body.req) throw invalidArgument('req is required')
        return json(request, env, {
          rewards: await botMatches.endTutorial(principal.userId, body.req)
        })
      }

      default:
        return json(
          request,
          env,
          { code: 'webrpc.not_found', msg: 'RPC method not found' },
          404
        )
    }
  } catch (error) {
    if (error instanceof RpcError) {
      return json(
        request,
        env,
        { code: error.code, msg: error.message, status: error.status },
        error.status
      )
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
