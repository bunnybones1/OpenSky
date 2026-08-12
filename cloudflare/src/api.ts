import type {
  Account,
  AccountAction,
  AccountRegistration,
  AccountStatus,
  Banner,
  BannersRequest,
  CardSearchCriteria,
  DeckClass,
  EpicType,
  FeedEventType,
  GameMode,
  GameModesStatus,
  GMListMatchesRequest,
  Hero,
  ItemType,
  NotificationOneTime,
  Page,
  PaymentProvider,
  PaymentStatus,
  QuestPeriodicity,
  SearchDeckRanksRequest
} from '@opensky/proto'
import {
  WebRPCSchemaHash,
  WebRPCSchemaVersion,
  WebRPCVersion
} from '@opensky/proto'
import { deriveGamePrincipal } from '@opensky/shared/game-principal'

import { AccountsRepository } from './accounts'
import { AccountActionsRepository } from './account-actions'
import { AccountReportsRepository } from './account-reports'
import { BotMatchRepository, type BotMatchEndRequest } from './bot-match'
import {
  allLibraryCards,
  libraryCardsByIds,
  libraryCardsFromDeckString,
  searchLibraryCards
} from './card-library'
import { CookiePoliciesRepository } from './cookie-policies'
import {
  ClientFeedbackRepository,
  MAX_FEEDBACK_REQUEST_BYTES
} from './client-feedback'
import { CompetitiveRepository } from './competitive'
import { ConquestRepository, conquestTreasureProgress } from './conquest'
import { pendingConquestCards } from './conquest-delivery'
import { DeckRanksRepository } from './deck-ranks'
import { ContentRepository } from './content'
import type { Env } from './env'
import {
  internal,
  invalidArgument,
  notFound,
  RpcError,
  unimplemented
} from './errors'
import { signSession } from './jwt'
import {
  currentSeasonStart,
  nextSeasonStart,
  questAutoRerollTimes,
  seasonFromDate,
  seasonName
} from './legacy-seasons'
import { PlayerRpcRepository } from './player-rpc'
import { PlayerSupportRepository } from './player-support'
import { listPaymentProviderProducts } from './payment-provider-products'
import { ProgressionSupportRepository } from './progression-support'
import { replayArchive } from './replays'
import { SocialRepository } from './social'
import { SkypassSupportRepository } from './skypass-support'
import { StaffRepository } from './staff'
import { StripeCheckoutRepository, type StripeFetch } from './stripe-checkout'
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
  stripeFetch?: StripeFetch
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

const authoritativeGameModesStatus = async (
  env: Env
): Promise<GameModesStatus> => {
  const response = await env.MATCH_SERVICE.fetch(
    new Request('https://cloud-weasel-match-service/internal/game-modes', {
      headers: { 'x-cloud-weasel-internal-auth': env.INTERNAL_AUTH_SECRET }
    })
  )
  if (!response.ok) throw new Error('match service mode status failed')
  const body = (await response.json()) as { status?: unknown }
  const keys: Array<keyof GameModesStatus> = [
    'tutorial',
    'practicePVP',
    'practiceBot',
    'warmUp',
    'rankedConstructed',
    'rankedDiscovery',
    'conquestConstructed',
    'conquestDiscovery',
    'challengeConstructed',
    'challengeDiscovery'
  ]
  if (
    typeof body.status !== 'object' ||
    body.status === null ||
    !keys.every(
      key => typeof (body.status as Record<string, unknown>)[key] === 'boolean'
    )
  ) {
    throw new Error('match service returned invalid mode status')
  }
  return body.status as GameModesStatus
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
  const accountActions = new AccountActionsRepository(env.AUTH_DB)
  const accountReports = new AccountReportsRepository(env.AUTH_DB)
  const cookiePolicies = new CookiePoliciesRepository(env.AUTH_DB)
  const clientFeedback = new ClientFeedbackRepository(
    env.AUTH_DB,
    env.CLIENT_FEEDBACK
  )
  const competitive = new CompetitiveRepository(env.AUTH_DB)
  const conquest = new ConquestRepository(env.AUTH_DB)
  const deckRanks = new DeckRanksRepository(env.AUTH_DB)
  const content = new ContentRepository(env.AUTH_DB)
  const playerRpc = new PlayerRpcRepository(env.AUTH_DB)
  const playerSupport = new PlayerSupportRepository(env.AUTH_DB)
  const progressionSupport = new ProgressionSupportRepository(env.AUTH_DB)
  const skypassSupport = new SkypassSupportRepository(env.AUTH_DB)
  const userStorage = new UserStorageRepository(env.AUTH_DB)
  const botMatches = new BotMatchRepository(env.AUTH_DB)
  const social = new SocialRepository(env.AUTH_DB)
  const staff = new StaffRepository(env.AUTH_DB)
  const stripe = new StripeCheckoutRepository(
    env.AUTH_DB,
    env,
    services.stripeFetch
  )

  try {
    switch (method) {
      case 'SignIn': {
        throw internal('deprecated method, use GetAuthToken + RegisterAccount')
      }

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

      case 'Ping': {
        await requestBody<Record<string, unknown>>(request)
        await env.AUTH_DB.prepare('SELECT COUNT(*) AS count FROM users').first()
        return json(request, env, { status: true })
      }

      case 'Version': {
        await requestBody<Record<string, unknown>>(request)
        return json(request, env, {
          version: {
            webrpcVersion: WebRPCVersion,
            schemaVersion: WebRPCSchemaVersion,
            schemaHash: WebRPCSchemaHash,
            appVersion: env.WORKER_VERSION.id
          }
        })
      }

      case 'Clock': {
        await requestBody<Record<string, unknown>>(request)
        return json(request, env, { serverTime: new Date().toISOString() })
      }

      case 'GetGameModesStatus': {
        await requestBody<Record<string, unknown>>(request)
        return json(request, env, {
          status: await authoritativeGameModesStatus(env)
        })
      }

      case 'HeroUnlockLevels': {
        await requestBody<Record<string, unknown>>(request)
        return json(request, env, {
          res: await playerRpc.heroUnlockLevels(seasonFromDate())
        })
      }

      case 'AvailableXPBonuses': {
        await identityPrincipal(request, env)
        await requestBody<Record<string, unknown>>(request)
        return json(request, env, { res: 0 })
      }

      case 'GetCardLibrary': {
        await requestBody<Record<string, unknown>>(request)
        return json(request, env, { cards: allLibraryCards() })
      }

      case 'GetCardsByID': {
        const body = await requestBody<{ cardIDs?: unknown }>(request)
        if (
          !Array.isArray(body.cardIDs) ||
          !body.cardIDs.every(
            id => typeof id === 'number' && Number.isSafeInteger(id) && id >= 0
          )
        ) {
          throw invalidArgument(
            'cardIDs must be an array of non-negative integers'
          )
        }
        return json(request, env, { cards: libraryCardsByIds(body.cardIDs) })
      }

      case 'GetCardsByDeckString': {
        const body = await requestBody<{ deckString?: unknown }>(request)
        if (typeof body.deckString !== 'string') {
          throw invalidArgument('deckString is required')
        }
        return json(request, env, {
          cards: libraryCardsFromDeckString(body.deckString)
        })
      }

      case 'SearchCards': {
        const body = await requestBody<{
          page?: Page
          req?: {
            criteria?: CardSearchCriteria
            includeUserBalances?: boolean
            contractQuery?: boolean
          }
        }>(request)
        if (!body.req || typeof body.req !== 'object') {
          throw invalidArgument('req is required')
        }
        if (
          body.req.criteria !== undefined &&
          (typeof body.req.criteria !== 'object' || body.req.criteria === null)
        ) {
          throw invalidArgument('req.criteria is invalid')
        }
        const criteria = body.req.criteria || {}
        const principal = await optionalRpcPrincipal(request, env)
        let inventoryUserId =
          principal?.kind === 'identity' ? principal.userId : undefined
        if (criteria.accountAddress !== undefined) {
          if (
            typeof criteria.accountAddress !== 'string' ||
            !criteria.accountAddress.startsWith('identity:')
          ) {
            throw invalidArgument('accountAddress is invalid')
          }
          const account = await playerRpc.getAccountByReference(
            criteria.accountAddress
          )
          if (!account) throw new Error('find account failed')
          inventoryUserId = criteria.accountAddress.slice('identity:'.length)
        }
        const inventory = inventoryUserId
          ? await playerRpc.cardSearchInventory(inventoryUserId)
          : []
        return json(
          request,
          env,
          searchLibraryCards(
            criteria,
            body.page,
            inventory,
            !!inventoryUserId,
            body.req.includeUserBalances === true
          )
        )
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

      case 'GetAccountByUsername': {
        const body = await requestBody<{ username?: unknown }>(request)
        if (typeof body.username !== 'string' || body.username === '') {
          throw invalidArgument('username is invalid')
        }
        const username = body.username.trim().toLowerCase()
        const principal = await optionalRpcPrincipal(request, env)
        const account =
          (await accounts.findByName(username)) ||
          (await playerRpc.getAccountByUsername(
            username,
            principal?.kind === 'identity' ? principal.userId : undefined
          ))
        if (!account) throw notFound('account not found')
        return json(request, env, { account })
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

      case 'RequestMoreInvites': {
        const principal = await identityPrincipal(request, env)
        return json(request, env, {
          status: await playerRpc.requestMoreInvites(principal.userId)
        })
      }

      case 'AdminListAccounts':
      case 'AdminSearchAccounts': {
        const principal = await identityPrincipal(request, env)
        await staff.requireAdmin(principal.userId)
        throw unimplemented()
      }

      case 'GMStats': {
        const principal = await identityPrincipal(request, env)
        await staff.requireAdmin(principal.userId)
        return json(request, env, { stats: await staff.stats() })
      }

      case 'GMFindAccount': {
        const principal = await identityPrincipal(request, env)
        await staff.requireAdmin(principal.userId)
        const body = await requestBody<{
          name?: string
          accountAddress?: string
        }>(request)
        if (!body.name && !body.accountAddress) {
          throw invalidArgument('both name and accountAddress missing')
        }
        const account = await playerRpc.getAccountForAdmin(
          body.name,
          body.accountAddress
        )
        if (!account) throw notFound('account not found')
        return json(request, env, { account })
      }

      case 'GMRenameAccount': {
        const principal = await identityPrincipal(request, env)
        await staff.requirePlayerSupportWrite(principal.userId)
        const body = await requestBody<{
          oldName?: string
          accountAddress?: string
          newName?: string
          lockedUntil?: string
        }>(request)
        const userId = await playerSupport.renameAccount(principal.userId, body)
        const account = await playerRpc.getAccountForAdmin(
          undefined,
          identityReferenceFor(userId)
        )
        if (!account) throw notFound('account not found')
        return json(request, env, { account })
      }

      case 'GMUnlockAllBaseCards': {
        const principal = await identityPrincipal(request, env)
        await staff.requirePlayerSupportWrite(principal.userId)
        const body = await requestBody<{ accountAddress?: string }>(request)
        return json(request, env, {
          ok: await playerSupport.unlockAllBaseCards(
            principal.userId,
            body.accountAddress
          )
        })
      }

      case 'GMSetWarmupGamesCompleted': {
        const principal = await identityPrincipal(request, env)
        await staff.requirePlayerSupportWrite(principal.userId)
        const body = await requestBody<{
          accountAddress?: string
          numGamesCompleted?: number
        }>(request)
        return json(request, env, {
          ok: await playerSupport.setWarmups(
            principal.userId,
            body.accountAddress,
            body.numGamesCompleted
          )
        })
      }

      case 'GMResetStarterDecks': {
        const principal = await identityPrincipal(request, env)
        await staff.requirePlayerSupportWrite(principal.userId)
        const body = await requestBody<{ address?: string }>(request)
        return json(request, env, {
          ok: await playerSupport.resetStarterDecks(
            principal.userId,
            body.address
          )
        })
      }

      case 'GMGiveLevels': {
        const principal = await identityPrincipal(request, env)
        await staff.requireProgressionWrite(principal.userId)
        const body = await requestBody<{
          accountAddress?: string
          levels?: number
        }>(request)
        return json(request, env, {
          ok: await progressionSupport.giveLevels(
            principal.userId,
            body.accountAddress,
            body.levels
          )
        })
      }

      case 'GMSetRP': {
        const principal = await identityPrincipal(request, env)
        await staff.requireProgressionWrite(principal.userId)
        const body = await requestBody<{
          accountAddress?: string
          mode?: GameMode
          rankPoints?: number
        }>(request)
        return json(request, env, {
          ok: await progressionSupport.setRP(
            principal.userId,
            body.accountAddress,
            body.mode,
            body.rankPoints
          )
        })
      }

      case 'GMCompleteQuest': {
        const principal = await identityPrincipal(request, env)
        await staff.requirePlayerSupportWrite(principal.userId)
        const body = await requestBody<{
          accountAddress?: string
          id?: number
        }>(request)
        return json(request, env, {
          ok: await playerSupport.completeQuest(
            principal.userId,
            body.accountAddress,
            body.id
          )
        })
      }

      case 'GMResetQuestReRolls': {
        const principal = await identityPrincipal(request, env)
        await staff.requirePlayerSupportWrite(principal.userId)
        const body = await requestBody<{
          accountAddress?: string
          periodicity?: QuestPeriodicity
        }>(request)
        return json(request, env, {
          ok: await playerSupport.resetQuestRerolls(
            principal.userId,
            body.accountAddress,
            body.periodicity
          )
        })
      }

      case 'GMDeleteQuest': {
        const principal = await identityPrincipal(request, env)
        await staff.requireAdmin(principal.userId)
        const body = await requestBody<{ accountAddress?: string }>(request)
        await playerSupport.rejectProductionQuestDelete(
          principal.userId,
          body.accountAddress
        )
      }

      case 'GMListAccounts': {
        const principal = await identityPrincipal(request, env)
        await staff.requireAdmin(principal.userId)
        const body = await requestBody<{
          page?: Page
          accountStatus?: AccountStatus[]
          accountActions?: AccountStatus[]
          createdBefore?: string
          createdAfter?: string
          conquestsUnlocked?: boolean
        }>(request)
        const result = await staff.listAccounts(body)
        const actionsByUser = await accountActions.forUsers(
          result.rows.map(row => row.user_id)
        )
        const accounts = await Promise.all(
          result.rows.map(async row => {
            const account = await playerRpc.getAccountForAdmin(
              undefined,
              identityReferenceFor(row.user_id)
            )
            if (!account) throw notFound('account not found')
            return {
              account,
              conquestsUnlocked: row.conquests_unlocked === 1,
              accountActions: actionsByUser.get(row.user_id) ?? [],
              ipHistory: []
            }
          })
        )
        return json(request, env, { page: result.page, accounts })
      }

      case 'GMListAccountSignals': {
        const principal = await identityPrincipal(request, env)
        await staff.requireAdmin(principal.userId)
        const body = await requestBody<{ account?: string }>(request)
        if (!body.account) throw invalidArgument('missing account address')
        return json(request, env, {
          signal: await staff.listAccountSignals(body.account)
        })
      }

      case 'GMAccountSignalSummaries': {
        const principal = await identityPrincipal(request, env)
        await staff.requireAdmin(principal.userId)
        const body = await requestBody<{
          page?: Page
          accountStatus?: AccountStatus[]
          createdBefore?: string
          createdAfter?: string
          accountAddress?: string
        }>(request)
        const result = await staff.signalSummaries(body)
        const actionsByUser = await accountActions.forUsers(
          result.rows.map(row => row.user_id)
        )
        const signals = await Promise.all(
          result.rows.map(async row => {
            const accountAddress = identityReferenceFor(row.user_id)
            const account = await playerRpc.getAccountForAdmin(
              undefined,
              accountAddress
            )
            if (!account) throw notFound('account not found')
            return {
              accountAddress,
              score: row.score,
              updatedAt: row.updated_at,
              account,
              accountActions: actionsByUser.get(row.user_id) ?? []
            }
          })
        )
        return json(request, env, { page: result.page, signals })
      }

      case 'GMListMatches': {
        const principal = await identityPrincipal(request, env)
        await staff.requireAdmin(principal.userId)
        const body = await requestBody<{
          page?: Page
          req?: GMListMatchesRequest
        }>(request)
        return json(
          request,
          env,
          await competitive.listAdminMatches(body.page, body.req)
        )
      }

      case 'GMSetReviewed': {
        const principal = await identityPrincipal(request, env)
        await staff.requireModerationWrite(principal.userId)
        const body = await requestBody<{
          matchId?: number
          reviewed?: boolean
        }>(request)
        if (body.matchId === undefined || body.reviewed === undefined) {
          throw invalidArgument('matchId and reviewed are required')
        }
        return json(request, env, {
          ok: await competitive.setReviewed(
            principal.userId,
            body.matchId,
            body.reviewed
          )
        })
      }

      case 'GMGameModeSet': {
        const principal = await identityPrincipal(request, env)
        await staff.requireGameModeWrite(principal.userId)
        const body = await requestBody<{
          gameMode?: GameMode
          enable?: boolean
        }>(request)
        if (body.gameMode === undefined || body.enable === undefined) {
          throw invalidArgument('gameMode and enable are required')
        }
        return json(request, env, {
          ok: await staff.setGameModeStatus(
            principal.userId,
            body.gameMode,
            body.enable
          )
        })
      }

      case 'GMGameModeStatusHistory': {
        const principal = await identityPrincipal(request, env)
        await staff.requireAdmin(principal.userId)
        const body = await requestBody<{
          page?: Page
          gameModes?: GameMode[]
        }>(request)
        const result = await staff.gameModeStatusHistory(
          body.page,
          body.gameModes
        )
        return json(request, env, {
          page: result.page,
          statusHistory: result.rows
        })
      }

      case 'GMListPendingCards': {
        const principal = await identityPrincipal(request, env)
        await staff.requireAdmin(principal.userId)
        const body = await requestBody<{ page?: Page }>(request)
        const result = await staff.pendingGold(body.page)
        const response = await Promise.all(
          result.rows.map(async row => {
            const account = await playerRpc.getAccountForAdmin(
              undefined,
              identityReferenceFor(row.userId)
            )
            if (!account) throw notFound('account not found')
            return {
              account,
              mintAt: row.mintAt,
              cardsWonLastDay: row.cardsWonLastDay,
              cardsWonLastWeek: row.cardsWonLastWeek
            }
          })
        )
        return json(request, env, { page: result.page, response })
      }

      case 'GMListBanners': {
        const principal = await identityPrincipal(request, env)
        await staff.requireAdmin(principal.userId)
        return json(request, env, {
          banners: await content.listAllBanners()
        })
      }

      case 'GMAddBanner': {
        const principal = await identityPrincipal(request, env)
        await staff.requireContentWrite(principal.userId)
        const body = await requestBody<{ bannersRequest?: BannersRequest }>(
          request
        )
        if (!body.bannersRequest) {
          throw invalidArgument('bannerRequest cannot be empty')
        }
        return json(request, env, {
          status: await content.addBanner(principal.userId, body.bannersRequest)
        })
      }

      case 'GMModifyBanner': {
        const principal = await identityPrincipal(request, env)
        await staff.requireContentWrite(principal.userId)
        const body = await requestBody<{ banner?: Banner }>(request)
        if (!body.banner) throw invalidArgument('banner cannot be empty')
        return json(request, env, {
          status: await content.modifyBanner(principal.userId, body.banner)
        })
      }

      case 'GMRemoveBanner': {
        const principal = await identityPrincipal(request, env)
        await staff.requireContentWrite(principal.userId)
        const body = await requestBody<{ id?: number }>(request)
        if (body.id === undefined) throw invalidArgument('id is required')
        return json(request, env, {
          status: await content.removeBanner(principal.userId, body.id)
        })
      }

      case 'GMAddFeaturedStreamer': {
        const principal = await identityPrincipal(request, env)
        await staff.requireContentWrite(principal.userId)
        const body = await requestBody<{ streamer?: { username?: string } }>(
          request
        )
        return json(request, env, {
          status: await content.addFeaturedStreamer(
            principal.userId,
            body.streamer?.username ?? ''
          )
        })
      }

      case 'GMRemoveFeaturedStreamer': {
        const principal = await identityPrincipal(request, env)
        await staff.requireContentWrite(principal.userId)
        const body = await requestBody<{ streamer?: { username?: string } }>(
          request
        )
        return json(request, env, {
          status: await content.removeFeaturedStreamer(
            principal.userId,
            body.streamer?.username ?? ''
          )
        })
      }

      case 'GMListOneTimeNotifications': {
        const principal = await identityPrincipal(request, env)
        await staff.requireAdmin(principal.userId)
        return json(request, env, {
          res: await content.listNotificationTemplates()
        })
      }

      case 'GMCreateOneTimeNotification': {
        const principal = await identityPrincipal(request, env)
        await staff.requireContentWrite(principal.userId)
        const body = await requestBody<{
          notification?: NotificationOneTime
        }>(request)
        if (!body.notification) {
          throw invalidArgument('notification is required')
        }
        return json(request, env, {
          res: await content.createNotificationTemplate(
            principal.userId,
            body.notification
          )
        })
      }

      case 'GMUpdateOneTimeNotification': {
        const principal = await identityPrincipal(request, env)
        await staff.requireContentWrite(principal.userId)
        const body = await requestBody<{
          notification?: NotificationOneTime
        }>(request)
        if (!body.notification) {
          throw invalidArgument('notification is required')
        }
        return json(request, env, {
          res: await content.updateNotificationTemplate(
            principal.userId,
            body.notification
          )
        })
      }

      case 'GMDeleteOneTimeNotification': {
        const principal = await identityPrincipal(request, env)
        await staff.requireContentWrite(principal.userId)
        const body = await requestBody<{ id?: number }>(request)
        if (body.id === undefined) throw invalidArgument('id is required')
        return json(request, env, {
          ok: await content.deleteNotificationTemplate(
            principal.userId,
            body.id
          )
        })
      }

      case 'GMListSkypassRewards': {
        const principal = await identityPrincipal(request, env)
        await staff.requireAdmin(principal.userId)
        const body = await requestBody<{ season?: number }>(request)
        const season = body.season || seasonFromDate()
        return json(request, env, {
          rewards: await playerRpc.listSkypassRewardDefinitions(season)
        })
      }

      case 'GMHasSkypassPremium': {
        const principal = await identityPrincipal(request, env)
        await staff.requireAdmin(principal.userId)
        const body = await requestBody<{ address?: string }>(request)
        if (!body.address) throw invalidArgument('address is required')
        return json(request, env, {
          has: await playerRpc.hasSkypassPremium(body.address, seasonFromDate())
        })
      }

      case 'GMToggleSkypassPremium': {
        const principal = await identityPrincipal(request, env)
        await staff.requireEntitlementWrite(principal.userId)
        const body = await requestBody<{ address?: string }>(request)
        return json(request, env, {
          has: await skypassSupport.togglePremium(
            principal.userId,
            body.address
          )
        })
      }

      case 'GMListConquestV2AccountTreasureProgress': {
        const principal = await identityPrincipal(request, env)
        await staff.requireAdmin(principal.userId)
        const body = await requestBody<{ page?: Page }>(request)
        const result = await staff.conquestTreasureProgress(body.page)
        return json(request, env, {
          page: result.page,
          data: result.rows.map(row => ({
            accountID: row.account_id,
            accountName: row.account_name,
            progress: conquestTreasureProgress(row.current_points)
          }))
        })
      }

      case 'GMIsAccountBanned': {
        const principal = await identityPrincipal(request, env)
        await staff.requireAdmin(principal.userId)
        const body = await requestBody<{ account?: string }>(request)
        if (!body.account) throw invalidArgument('account is required')
        if (!body.account.startsWith('identity:')) {
          throw notFound(
            `account with the address '${body.account}' does not exist`
          )
        }
        const userId = body.account.slice('identity:'.length)
        const actions = await accountActions.forUser(userId, true)
        return json(request, env, {
          banned: actions.length > 0,
          status: await staff.accountStatus(body.account),
          accountActions: actions
        })
      }

      case 'GMListAccountActions': {
        const principal = await identityPrincipal(request, env)
        await staff.requireAdmin(principal.userId)
        const body = await requestBody<{ page?: Page }>(request)
        const result = await accountActions.list(body.page)
        return json(request, env, {
          page: result.page,
          accountActions: result.actions
        })
      }

      case 'GMCreateAccountAction': {
        const principal = await identityPrincipal(request, env)
        await staff.requireAccountActionWrite(principal.userId)
        const body = await requestBody<{ action?: AccountAction }>(request)
        if (!body.action) throw invalidArgument('missing action to create')
        return json(request, env, {
          action: await accountActions.create(principal.userId, body.action)
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

      case 'SetInvitedBy': {
        const principal = await identityPrincipal(request, env)
        const body = await requestBody<{
          req?: { address?: string; invitedBy?: string }
        }>(request)
        if (!body.req?.address || !body.req.invitedBy) {
          throw invalidArgument('req.address and req.invitedBy are required')
        }
        return json(request, env, {
          ok: await social.setInvitedBy(
            principal.userId,
            body.req.address,
            body.req.invitedBy
          )
        })
      }

      case 'GetFriendPoints': {
        const principal = await identityPrincipal(request, env)
        await requestBody<{ address?: string }>(request)
        return json(
          request,
          env,
          await social.getFriendPoints(principal.userId)
        )
      }

      case 'GetPointsGifted': {
        const principal = await identityPrincipal(request, env)
        await requestBody<{ address?: string }>(request)
        return json(
          request,
          env,
          await social.getPointsGifted(principal.userId)
        )
      }

      case 'EnterConquest': {
        const principal = await identityPrincipal(request, env)
        const body = await requestBody<{ hero?: Hero }>(request)
        if (!body.hero) throw invalidArgument('hero is required')
        return json(request, env, {
          status: await conquest.enter(principal.userId, body.hero)
        })
      }

      case 'ConquestStatus': {
        const principal = await identityPrincipal(request, env)
        await requestBody<Record<string, never>>(request)
        return json(request, env, {
          conquest: await conquest.status(principal.userId)
        })
      }

      case 'ConquestStats': {
        const principal = await identityPrincipal(request, env)
        await requestBody<Record<string, never>>(request)
        return json(request, env, {
          stats: await conquest.stats(principal.userId)
        })
      }

      case 'ConquestRewards': {
        await requestBody<Record<string, never>>(request)
        return json(request, env, { weeklyGolds: await conquest.rewards() })
      }

      case 'ConquestPoints': {
        const principal = await identityPrincipal(request, env)
        await requestBody<Record<string, never>>(request)
        const points = await conquest.points(principal.userId)
        return json(request, env, { points: points.current, nedeed: 30 })
      }

      case 'ConquestV2Pool': {
        await requestBody<Record<string, never>>(request)
        return json(request, env, { pool: { amount: 0, totalWeight: 0 } })
      }

      case 'ConquestV2Progress': {
        const principal = await identityPrincipal(request, env)
        await requestBody<Record<string, never>>(request)
        const points = await conquest.points(principal.userId)
        return json(request, env, {
          progress: conquestTreasureProgress(points.current)
        })
      }

      case 'ConquestTreasuresInfo': {
        await requestBody<Record<string, never>>(request)
        return json(request, env, {
          treasures: Object.fromEntries(
            Array.from({ length: 11 }, (_, level) => [
              level,
              { amountSilver: 0, amountUSDC: 0 }
            ])
          )
        })
      }

      case 'GetPrivateSpectateCode': {
        const principal = await identityPrincipal(request, env)
        const body = await requestBody<{ reset?: boolean }>(request)
        return json(request, env, {
          code: await playerRpc.getPrivateSpectateCode(
            principal.userId,
            body.reset === true
          )
        })
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

      case 'GetMatch': {
        const principal = await identityPrincipal(request, env)
        const body = await requestBody<{ matchID?: number }>(request)
        return json(request, env, {
          match: await competitive.getMatch(principal.userId, body.matchID ?? 0)
        })
      }

      case 'ReportAccount': {
        const principal = await identityPrincipal(request, env)
        const body = await requestBody<{
          report?: {
            reportedAddress?: string
            matchId?: number
            reporterComment?: string
          }
        }>(request)
        if (!body.report) throw invalidArgument('missing report data')
        return json(request, env, {
          ok: await accountReports.report(principal.userId, body.report)
        })
      }

      case 'GetMatchArchiveRecordsURI': {
        const body = await requestBody<{
          matchID?: number
          replayID?: string
        }>(request)
        return json(
          request,
          env,
          await replayArchive(
            request,
            env,
            body.matchID ?? 0,
            body.replayID ?? ''
          )
        )
      }

      case 'GetMatchLiveRecordsURI': {
        await requestBody<{ matchID?: number }>(request)
        throw unimplemented()
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

      case 'GetFeed': {
        await identityPrincipal(request, env)
        const body = await requestBody<{
          page?: Page
          req?: {
            accountAddress?: string
            types?: FeedEventType[]
          }
        }>(request)
        if (!body.req?.accountAddress) {
          throw invalidArgument('account_address is required')
        }
        return json(
          request,
          env,
          await playerRpc.feed(
            body.req.accountAddress,
            body.page,
            body.req.types
          )
        )
      }

      case 'GetItemSummary': {
        const principal = await identityPrincipal(request, env)
        const body = await requestBody<{
          accountAddress?: string
          contractQuery?: boolean
        }>(request)
        if (!body.accountAddress) {
          throw invalidArgument('accountAddress is required')
        }
        return json(request, env, {
          summary: await playerRpc.itemSummary(
            principal.userId,
            body.accountAddress
          )
        })
      }

      case 'GetItemSupply': {
        const body = await requestBody<{ tokenID?: number }>(request)
        if (body.tokenID === undefined) {
          throw invalidArgument('tokenID is required')
        }
        return json(request, env, {
          summary: await playerRpc.itemSupply(body.tokenID)
        })
      }

      case 'GetBatchItemSupply': {
        const body = await requestBody<{ tokenIDs?: unknown }>(request)
        if (!Array.isArray(body.tokenIDs)) {
          throw invalidArgument('tokenIDs is required')
        }
        return json(request, env, {
          summary: await playerRpc.batchItemSupply(body.tokenIDs)
        })
      }

      case 'GetItemSuppliesByType': {
        const body = await requestBody<{ itemTypes?: unknown }>(request)
        if (!Array.isArray(body.itemTypes)) {
          throw invalidArgument('itemTypes is required')
        }
        return json(request, env, {
          summary: await playerRpc.itemSuppliesByType(body.itemTypes)
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
        const principal = await identityPrincipal(request, env)
        return json(request, env, {
          res: await pendingConquestCards(env.AUTH_DB, principal.userId)
        })
      }

      case 'GetBanners': {
        return json(request, env, { banners: await content.listBanners() })
      }

      case 'GetFeaturedStreamers': {
        return json(request, env, {
          streamers: await content.listFeaturedStreamers()
        })
      }

      case 'GetStickers': {
        return json(request, env, {
          stickers: await content.listStickers(seasonFromDate())
        })
      }

      case 'GetStickersBySeason': {
        const body = await requestBody<{ season?: number }>(request)
        if (
          !Number.isSafeInteger(body.season) ||
          (body.season ?? -1) < 0 ||
          (body.season ?? 65_536) > 65_535
        ) {
          throw invalidArgument('season must be an unsigned 16-bit integer')
        }
        return json(request, env, {
          stickers: await content.listStickers(body.season!)
        })
      }

      case 'GetStickerOwnership': {
        const principal = await identityPrincipal(request, env)
        return json(request, env, {
          res: await content.stickerOwnership(principal.userId)
        })
      }

      case 'ListNotifications': {
        const principal = await identityPrincipal(request, env)
        return json(request, env, {
          notifications: await content.listNotifications(principal.userId)
        })
      }

      case 'SetNotificationsAsSeen': {
        const principal = await identityPrincipal(request, env)
        const body = await requestBody<{ notificationIDs?: number[] }>(request)
        if (
          !Array.isArray(body.notificationIDs) ||
          body.notificationIDs.length < 1 ||
          body.notificationIDs.length > 100 ||
          body.notificationIDs.some(id => !Number.isSafeInteger(id) || id <= 0)
        ) {
          throw invalidArgument(
            'notificationIDs must contain 1 to 100 positive integers'
          )
        }
        return json(request, env, {
          status: await content.setNotificationsSeen(principal.userId, [
            ...new Set(body.notificationIDs)
          ])
        })
      }

      case 'ListDecks': {
        const principal = await identityPrincipal(request, env)
        return json(request, env, {
          page: { pageSize: 200 },
          res: await playerRpc.listDecks(principal.userId)
        })
      }

      case 'ListDeckRanks': {
        const body = await requestBody<{
          page?: Page
          req?: { class?: DeckClass }
        }>(request)
        return json(
          request,
          env,
          await deckRanks.list(body.page, body.req?.class, userId =>
            playerRpc.getAccountByReference(identityReferenceFor(userId))
          )
        )
      }

      case 'SearchDeckRanks': {
        await identityPrincipal(request, env)
        const body = await requestBody<{
          page?: Page
          req?: SearchDeckRanksRequest
        }>(request)
        if (!body.req || typeof body.req !== 'object') {
          throw invalidArgument('req is required')
        }
        return json(request, env, await deckRanks.search(body.page, body.req))
      }

      case 'SearchDecks': {
        const principal = await identityPrincipal(request, env)
        const body = await requestBody<{
          page?: Page
          req?: {
            deckString?: string
            name?: string
            class?: DeckClass
          }
        }>(request)
        if (!body.req || typeof body.req !== 'object') {
          throw invalidArgument('req is required')
        }
        return json(
          request,
          env,
          await playerRpc.searchDecks(principal.userId, body.req, body.page)
        )
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

      case 'CheckDeck': {
        const principal = await identityPrincipal(request, env)
        const body = await requestBody<{
          req?: {
            accountAddress?: string
            uuid?: string
            deckString?: string
            contractQuery?: boolean
          }
        }>(request)
        if (!body.req || typeof body.req !== 'object') {
          throw invalidArgument('req is required')
        }
        return json(request, env, {
          res: await playerRpc.checkDeck(principal.userId, body.req)
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

      case 'ToggleDeckFavorite': {
        const principal = await identityPrincipal(request, env)
        const body = await requestBody<{ uuid?: string }>(request)
        if (!body.uuid) throw invalidArgument('uuid is required')
        return json(request, env, {
          isFavorite: await playerRpc.toggleDeckFavorite(
            principal.userId,
            body.uuid
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

      case 'ReRollQuest': {
        const principal = await identityPrincipal(request, env)
        const body = await requestBody<{ id?: number }>(request)
        if (!Number.isSafeInteger(body.id) || (body.id || 0) <= 0) {
          throw invalidArgument('id must be a positive integer')
        }
        return json(
          request,
          env,
          await playerRpc.rerollQuest(principal.userId, body.id!)
        )
      }

      case 'GetQuestsAutoRerollTime': {
        return json(request, env, { res: questAutoRerollTimes() })
      }

      case 'GetEpicQuestChain': {
        const principal = await identityPrincipal(request, env)
        const body = await requestBody<{ epicType?: EpicType }>(request)
        if (body.epicType === undefined) {
          throw new Error('epic type cannot be nil')
        }
        return json(request, env, {
          quests: await playerRpc.epicQuestChain(
            principal.userId,
            body.epicType
          )
        })
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

      case 'RecordGameClientFeedback': {
        const principal = await identityPrincipal(request, env)
        const contentLength = request.headers.get('Content-Length')
        if (
          contentLength &&
          (!/^\d+$/.test(contentLength) ||
            Number(contentLength) > MAX_FEEDBACK_REQUEST_BYTES)
        ) {
          throw invalidArgument('feedback request is too large')
        }
        const text = await request.text()
        if (
          new TextEncoder().encode(text).byteLength > MAX_FEEDBACK_REQUEST_BYTES
        ) {
          throw invalidArgument('feedback request is too large')
        }
        let body: { req?: unknown }
        try {
          body = JSON.parse(text) as typeof body
        } catch {
          throw invalidArgument('request body must be JSON')
        }
        return json(request, env, {
          status: await clientFeedback.record(principal.userId, body.req)
        })
      }

      case 'ListPaymentProviderProducts': {
        await identityPrincipal(request, env)
        const body = await requestBody<{
          provider?: PaymentProvider
          itemType?: ItemType
        }>(request)
        if (!body.provider) throw invalidArgument('provider is required')
        return json(request, env, {
          products: listPaymentProviderProducts(body.provider, body.itemType)
        })
      }

      case 'CreateStripePaymentIntent': {
        const principal = await identityPrincipal(request, env)
        const body = await requestBody<{ productID?: string }>(request)
        if (!body.productID) throw invalidArgument('productID is required')
        return json(request, env, {
          checkout: await stripe.createCheckout(
            principal.userId,
            body.productID
          )
        })
      }

      case 'StripeEventWebhook': {
        await stripe.handleWebhook(request)
        return json(request, env, {})
      }

      case 'GMListPayments': {
        const principal = await identityPrincipal(request, env)
        await staff.requireAdmin(principal.userId)
        const body = await requestBody<{
          page?: Page
          status?: PaymentStatus
          provider?: PaymentProvider
          address?: string
        }>(request)
        return json(request, env, await stripe.listStaffPayments(body))
      }

      case 'GMListPaymentLogs': {
        const principal = await identityPrincipal(request, env)
        await staff.requireAdmin(principal.userId)
        const body = await requestBody<{ paymentID?: number }>(request)
        return json(request, env, {
          logs: await stripe.listStaffPaymentLogs(body.paymentID ?? 0)
        })
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
