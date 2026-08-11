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

export interface PlayerQuest {
  key: string
  title: string
  description: string
  progress: number
  target: number
  rewardXp: number
  status: 'active' | 'complete' | 'claimed'
}

export interface PlayerCardUnlock {
  id: number
  name: string
  prism: string
  unlockSource: string
  unlockedAt: string
}

export interface PlayerDeck {
  id: string
  name: string
  prism: string
  deckString: string
  cardCount: number
  isStarter: boolean
}

export interface PlayerState {
  profile: {
    name: string
    locale: string
    region?: string
    tagArtID?: string
    titleID?: number
    level: number
    xp: number
    nextLevelXp: number
    createdAt: string
    updatedAt: string
  }
  basicSkyPass: {
    level: number
    xp: number
    nextLevelXp: number
  }
  tutorialCompleted: boolean
  quests: PlayerQuest[]
  collection: {
    basicCards: PlayerCardUnlock[]
    basicCardCount: number
  }
  decks: PlayerDeck[]
}

export type IdentitySession =
  | {
      authenticated: false
      providers: { google: boolean }
    }
  | {
      authenticated: true
      user: IdentityUser
      gamePrincipal: string
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

  public bootstrapPlayer = async (): Promise<{
    player: PlayerState
    created: boolean
  }> => {
    const response = await fetch('/api/player/bootstrap', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' }
    })
    if (!response.ok) {
      if (response.status === 401)
        throw new Error('Your sign-in session has expired.')
      throw new Error('Unable to set up your Cloud Weasel player.')
    }
    return response.json()
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
