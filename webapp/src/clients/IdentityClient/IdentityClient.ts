import { removeExternalUserId } from '~/shared/helpers/one-signal'

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

export interface WalletLinkChallenge {
  challengeId: string
  namespace: 'eip155'
  address: string
  chainId: number
  message: string
  expiresAt: string
}

export interface ExternalWalletHolding {
  itemType: string
  tokenId: number
  rawTokenId: string
  balance: string
  rawBalance: string
}

export interface ExternalWalletContents {
  address: string
  label?: string
  verifiedAt: string
  holdings: ExternalWalletHolding[]
  totals: Record<string, string>
  truncated: boolean
}

export type WalletContentsProjection =
  | { status: 'not_configured'; chainId: 137; wallets: [] }
  | {
      status: 'available'
      chainId: 137
      contractAddress: string
      wallets: ExternalWalletContents[]
      totals: Record<string, string>
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

export interface PremiumSkyPassCommerceCapability {
  available: boolean
  provider: 'STRIPE'
  productCode: 'skypass_0001'
  fulfillment: 'OFFCHAIN'
  price: {
    currency: 'USD'
    amountMinor: 1495
    display: '$14.95'
  }
}

export interface CommerceCapabilities {
  premiumSkyPass: PremiumSkyPassCommerceCapability
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

  private walletRequest = async <T>(
    path: string,
    method: 'POST' | 'DELETE',
    body: unknown
  ): Promise<T> => {
    const response = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })
    const result = (await response.json()) as T & { message?: string }
    if (!response.ok) {
      throw new Error(result.message || 'Unable to update linked wallets.')
    }
    return result
  }

  public createWalletChallenge = async (input: {
    address: string
    chainId: 137
  }): Promise<WalletLinkChallenge> => {
    const response = await this.walletRequest<{
      challenge: WalletLinkChallenge
    }>('/api/auth/wallet/challenge', 'POST', input)
    return response.challenge
  }

  public verifyWalletChallenge = async (input: {
    challengeId: string
    signature: string
    label?: string
  }): Promise<WalletConnection[]> => {
    const response = await this.walletRequest<{
      wallets: WalletConnection[]
    }>('/api/auth/wallet/verify', 'POST', input)
    return response.wallets
  }

  public unlinkWallet = async (address: string): Promise<WalletConnection[]> => {
    const response = await this.walletRequest<{
      wallets: WalletConnection[]
    }>('/api/auth/wallet', 'DELETE', { address })
    return response.wallets
  }

  public getWalletContents = async (): Promise<WalletContentsProjection> => {
    const response = await fetch('/api/auth/wallet/contents', {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' }
    })
    const result = (await response.json()) as WalletContentsProjection & {
      message?: string
    }
    if (!response.ok) {
      throw new Error(result.message || 'Unable to read linked wallet contents.')
    }
    return result
  }

  public startAccountDeletion = async (
    accountName: string,
    returnTo: string
  ): Promise<void> => {
    const response = await fetch('/api/auth/account-deletion/start', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ accountName, returnTo })
    })
    const body = (await response.json()) as {
      authorizationUrl?: string
      message?: string
    }
    if (!response.ok || !body.authorizationUrl) {
      throw new Error(body.message || 'Unable to start account deletion.')
    }
    window.location.assign(body.authorizationUrl)
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

  public getCommerceCapabilities = async (): Promise<CommerceCapabilities> => {
    const response = await fetch('/api/player/commerce/capabilities', {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' }
    })
    const body = (await response.json()) as {
      commerce?: CommerceCapabilities
      message?: string
    }
    if (!response.ok || !body.commerce) {
      throw new Error(body.message || 'Unable to load commerce availability.')
    }
    return body.commerce
  }

  public createPremiumSkyPassCheckout = async (): Promise<{
    url: string
  }> => {
    const response = await fetch('/api/player/commerce/skypass/checkout', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' }
    })
    const body = (await response.json()) as {
      checkout?: { url?: string }
      message?: string
    }
    if (!response.ok || typeof body.checkout?.url !== 'string') {
      throw new Error(body.message || 'Unable to start Premium SkyPass checkout.')
    }
    return { url: body.checkout.url }
  }

  public exchangeSilverCardsForTickets = async (input: {
    requestKey: string
    cards: Array<{ tokenId: number; quantity: number }>
  }): Promise<{
    exchange: {
      cards: Array<{ tokenId: number; quantity: number }>
      tickets: number
      createdAt: string
    }
  }> => {
    const response = await fetch('/api/player/exchanges/silver-tickets', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(input)
    })
    const body = (await response.json()) as {
      exchange?: {
        cards: Array<{ tokenId: number; quantity: number }>
        tickets: number
        createdAt: string
      }
      message?: string
    }
    if (!response.ok || !body.exchange) {
      throw new Error(body.message || 'Unable to exchange Silver cards.')
    }
    return { exchange: body.exchange }
  }

  public exchangeGoldCardsForHeroSkins = async (input: {
    requestKey: string
    goldCards: Array<{ tokenId: number; quantity: number }>
    heroSkins: Array<{ tokenId: number; quantity: number }>
  }): Promise<{
    exchange: {
      goldCards: Array<{ tokenId: number; quantity: number }>
      heroSkins: Array<{ tokenId: number; quantity: number }>
      goldCardsSpent: number
      heroSkinsGranted: number
      createdAt: string
    }
  }> => {
    const response = await fetch('/api/player/exchanges/gold-hero-skins', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(input)
    })
    const body = (await response.json()) as {
      exchange?: {
        goldCards: Array<{ tokenId: number; quantity: number }>
        heroSkins: Array<{ tokenId: number; quantity: number }>
        goldCardsSpent: number
        heroSkinsGranted: number
        createdAt: string
      }
      message?: string
    }
    if (!response.ok || !body.exchange) {
      throw new Error(body.message || 'Unable to exchange Gold cards.')
    }
    return { exchange: body.exchange }
  }

  public signOut = async (): Promise<void> => {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' }
    })
    if (!response.ok) throw new Error('Unable to sign out. Please try again.')
    await removeExternalUserId().catch((pushError) => {
      // Device push is optional and must never strand a cleared app session on
      // the signed-in screen. A later login replaces the external identity.
      console.error('failed to unlink Cloud Weasel push identity', pushError)
    })
  }
}

export const identityClient = new IdentityClient()
