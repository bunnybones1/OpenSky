export interface IdentityUser {
  id: string
  displayName: string
  email: string
  avatarUrl?: string
}

export interface WalletConnection {
  namespace: string
  address: string
  source: string
  label?: string
  verifiedAt: string
}

export type IdentitySession =
  | {
      authenticated: false
      providers: { google: boolean }
    }
  | {
      authenticated: true
      user: IdentityUser
      wallets: WalletConnection[]
      providers: { google: boolean }
    }

const sessionUrl = '/api/auth/session'

class IdentityClient {
  public getSession = async (): Promise<IdentitySession> => {
    const response = await fetch(sessionUrl, {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' }
    })
    if (!response.ok) throw new Error('Unable to load your sign-in status.')
    return response.json()
  }

  public signInWithGoogle = () => {
    const returnUrl = new URL(window.location.href)
    returnUrl.searchParams.delete('auth')
    returnUrl.searchParams.delete('auth_error')
    const returnTo = `${returnUrl.pathname}${returnUrl.search}${returnUrl.hash}`
    window.location.assign(
      `/api/auth/google/start?returnTo=${encodeURIComponent(returnTo)}`
    )
  }

  public signOut = async (): Promise<void> => {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' }
    })
    if (!response.ok) throw new Error('Unable to sign out. Please try again.')
  }
}

export const identityClient = new IdentityClient()
