import { readCookies } from './cookies'
import type { Env } from './env'
import {
  IDENTITY_SESSION_COOKIE,
  verifyIdentitySession
} from './identity-session'
import { PlayerRepository } from './player'
import { AccountActionsRepository } from './account-actions'
import { RpcError } from './errors'
import {
  HeroSkinExchangeRepository,
  type HeroSkinExchangeInput
} from './hero-skin-exchange'
import {
  SilverTicketExchangeRepository,
  type SilverCardExchangeInput
} from './silver-ticket-exchange'
import {
  premiumSkypassCommerceCapability,
  StripeCheckoutRepository,
  type StripeFetch
} from './stripe-checkout'

export interface PlayerApiServices {
  stripeFetch?: StripeFetch
  createStripeCheckout?: (
    userId: string,
    productCode: 'skypass_0001'
  ) => Promise<{ url: string }>
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  })

const authenticatedUserId = (request: Request, env: Env) => {
  const token = readCookies(request).get(IDENTITY_SESSION_COOKIE)
  return token
    ? verifyIdentitySession(token, env.SESSION_SIGNING_KEY)
    : undefined
}

const sameOrigin = (request: Request): boolean => {
  const origin = request.headers.get('Origin')
  return !origin || origin === new URL(request.url).origin
}

export const handlePlayerRequest = async (
  request: Request,
  env: Env,
  services: PlayerApiServices = {}
): Promise<Response> => {
  const userId = await authenticatedUserId(request, env)
  if (!userId) {
    return json(
      {
        code: 'player.unauthorized',
        message: 'Sign in to access player data.'
      },
      401
    )
  }
  try {
    await new AccountActionsRepository(env.AUTH_DB).enforcePlayerAccess(userId)
  } catch (error) {
    if (!(error instanceof RpcError) || error.status !== 403) throw error
    return json(
      {
        code: 'player.forbidden',
        message: error instanceof Error ? error.message : 'account banned'
      },
      403
    )
  }

  const url = new URL(request.url)
  const players = new PlayerRepository(env.AUTH_DB)

  try {
    if (url.pathname === '/api/player/bootstrap' && request.method === 'POST') {
      if (!sameOrigin(request)) {
        return json(
          {
            code: 'player.forbidden',
            message: 'Cross-origin requests are not allowed.'
          },
          403
        )
      }
      const existing = await players.getState(userId)
      return json({
        player: await players.bootstrap(userId),
        created: !existing
      })
    }
    if (url.pathname === '/api/player/state' && request.method === 'GET') {
      const player = await players.getState(userId)
      return player
        ? json({ player })
        : json(
            {
              code: 'player.not_initialized',
              message: 'Player setup is required.'
            },
            404
          )
    }
    if (
      url.pathname === '/api/player/commerce/capabilities' &&
      request.method === 'GET'
    ) {
      return json({
        commerce: {
          premiumSkyPass: premiumSkypassCommerceCapability(env)
        }
      })
    }
    if (
      url.pathname === '/api/player/commerce/skypass/checkout' &&
      request.method === 'POST'
    ) {
      if (!sameOrigin(request)) {
        return json(
          {
            code: 'player.forbidden',
            message: 'Cross-origin requests are not allowed.'
          },
          403
        )
      }
      const capability = premiumSkypassCommerceCapability(env)
      if (!capability.available) {
        return json(
          {
            code: 'player.commerce_unavailable',
            message: 'Premium SkyPass checkout is not available.'
          },
          503
        )
      }
      const checkout = services.createStripeCheckout
        ? await services.createStripeCheckout(userId, capability.productCode)
        : await new StripeCheckoutRepository(
            env.AUTH_DB,
            env,
            services.stripeFetch
          ).createCheckout(userId, capability.productCode)
      return json({ checkout })
    }
    if (
      url.pathname === '/api/player/exchanges/silver-tickets' &&
      request.method === 'POST'
    ) {
      if (!sameOrigin(request)) {
        return json(
          {
            code: 'player.forbidden',
            message: 'Cross-origin requests are not allowed.'
          },
          403
        )
      }
      const contentType = request.headers.get('Content-Type') || ''
      if (!contentType.toLowerCase().startsWith('application/json')) {
        return json(
          {
            code: 'player.invalid_argument',
            message: 'JSON request body is required.'
          },
          400
        )
      }
      const input = (await request.json()) as SilverCardExchangeInput
      const exchange = await new SilverTicketExchangeRepository(
        env.AUTH_DB
      ).exchange(userId, input)
      return json({ exchange })
    }
    if (
      url.pathname === '/api/player/exchanges/gold-hero-skins' &&
      request.method === 'POST'
    ) {
      if (!sameOrigin(request)) {
        return json(
          {
            code: 'player.forbidden',
            message: 'Cross-origin requests are not allowed.'
          },
          403
        )
      }
      const contentType = request.headers.get('Content-Type') || ''
      if (!contentType.toLowerCase().startsWith('application/json')) {
        return json(
          {
            code: 'player.invalid_argument',
            message: 'JSON request body is required.'
          },
          400
        )
      }
      const input = (await request.json()) as HeroSkinExchangeInput
      const exchange = await new HeroSkinExchangeRepository(
        env.AUTH_DB
      ).exchange(userId, input)
      return json({ exchange })
    }
    return json(
      { code: 'player.not_found', message: 'Player route not found.' },
      404
    )
  } catch (error) {
    if (error instanceof RpcError) {
      return json({ code: error.code, message: error.message }, error.status)
    }
    console.error('Cloudflare player API error', error)
    return json(
      { code: 'player.internal', message: 'Unable to load player data.' },
      500
    )
  }
}
