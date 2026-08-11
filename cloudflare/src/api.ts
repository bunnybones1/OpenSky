import type { AccountRegistration } from '@opensky/proto'

import { AccountsRepository } from './accounts'
import { CookiePoliciesRepository } from './cookie-policies'
import type { Env } from './env'
import { invalidArgument, RpcError } from './errors'
import { bearerToken, signSession, verifySession } from './jwt'
import type { VerifiedProof } from './proof'
import { verifySequenceProof } from './proof'

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

const sessionAddress = async (request: Request, env: Env): Promise<string> => {
  const claims = await verifySession(bearerToken(request), env.SESSION_SIGNING_KEY)
  return claims.account.toLowerCase()
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
        const address = await sessionAddress(request, env)
        const account = await accounts.findByAddress(address)
        return json(request, env, { address, ...(account ? { account } : {}) })
      }

      case 'RegisterAccount': {
        const address = await sessionAddress(request, env)
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
        const address = await sessionAddress(request, env)
        return json(request, env, { res: await cookiePolicies.get(address) })
      }

      case 'SaveCookiePolicy': {
        const address = await sessionAddress(request, env)
        const body = await requestBody<{ cookieOptions?: Record<string, boolean> }>(request)
        if (!body.cookieOptions || typeof body.cookieOptions !== 'object') {
          throw invalidArgument('cookieOptions is required')
        }
        await cookiePolicies.save(address, body.cookieOptions)
        return json(request, env, { status: true })
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
