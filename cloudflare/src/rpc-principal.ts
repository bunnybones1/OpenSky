import { readCookies } from './cookies'
import type { Env } from './env'
import { unauthenticated } from './errors'
import { AccountActionsRepository } from './account-actions'
import {
  IDENTITY_SESSION_COOKIE,
  verifyIdentitySession
} from './identity-session'
import { bearerToken, verifySession } from './jwt'

export type RpcPrincipal =
  | {
      kind: 'wallet'
      reference: string
    }
  | {
      kind: 'identity'
      reference: string
      userId: string
    }

export const identityReferenceFor = (userId: string) => `identity:${userId}`

export const optionalRpcPrincipal = async (
  request: Request,
  env: Env
): Promise<RpcPrincipal | null> => {
  if (request.headers.has('Authorization')) {
    const claims = await verifySession(
      bearerToken(request),
      env.SESSION_SIGNING_KEY
    )
    return { kind: 'wallet', reference: claims.account.toLowerCase() }
  }

  const token = readCookies(request).get(IDENTITY_SESSION_COOKIE)
  if (!token) return null
  const userId = await verifyIdentitySession(token, env.SESSION_SIGNING_KEY)
  if (!userId) throw unauthenticated()
  await new AccountActionsRepository(env.AUTH_DB).enforcePlayerAccess(userId)
  return { kind: 'identity', userId, reference: identityReferenceFor(userId) }
}

export const rpcPrincipal = async (
  request: Request,
  env: Env
): Promise<RpcPrincipal> => {
  const principal = await optionalRpcPrincipal(request, env)
  if (!principal) throw unauthenticated()
  return principal
}
