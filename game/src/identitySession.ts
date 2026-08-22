const GAME_PRINCIPAL_PATTERN = /^0x[0-9a-f]{40}$/

interface IdentitySession {
  authenticated?: boolean
  gamePrincipal?: unknown
}

export const gamePrincipalFromIdentitySession = (value: unknown): string => {
  if (!value || typeof value !== 'object') {
    throw new Error('Identity session response is invalid.')
  }

  const session = value as IdentitySession
  if (session.authenticated !== true) {
    throw new Error('Identity session is not authenticated.')
  }
  if (
    typeof session.gamePrincipal !== 'string' ||
    !GAME_PRINCIPAL_PATTERN.test(session.gamePrincipal)
  ) {
    throw new Error('Identity session has no valid game principal.')
  }

  return session.gamePrincipal
}

export const fetchIdentityGamePrincipal = async (
  apiHost: string,
  fetcher: typeof fetch = window.fetch.bind(window)
): Promise<string> => {
  const response = await fetcher(`${apiHost.replace(/\/$/, '')}/auth/session`, {
    credentials: 'same-origin',
    headers: { Accept: 'application/json' }
  })
  if (!response.ok) {
    throw new Error(`Identity session request failed (${response.status}).`)
  }

  return gamePrincipalFromIdentitySession(await response.json())
}
