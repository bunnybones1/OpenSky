import { handleApiRequest } from './api'
import type { Env } from './env'
import { handleIdentityRequest } from './identity-api'

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/api/auth/')) return handleIdentityRequest(request, env)
    if (url.pathname.startsWith('/api/')) return handleApiRequest(request, env)
    return env.ASSETS.fetch(request)
  }
} satisfies ExportedHandler<Env>
