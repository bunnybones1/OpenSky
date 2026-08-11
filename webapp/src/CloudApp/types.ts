import type {
  IdentitySession,
  WalletConnection
} from '~/clients/IdentityClient/IdentityClient'

export type AuthenticatedIdentitySession = Extract<
  IdentitySession,
  { authenticated: true }
>

export interface CloudPlayerQuest {
  key: string
  title: string
  description: string
  progress: number
  target: number
  rewardXp: number
  status: 'active' | 'complete' | 'claimed'
}

export interface CloudPlayerCard {
  id: number
  name: string
  prism: string
  unlockSource: string
  unlockedAt: string
}

export interface CloudPlayerDeck {
  id: string
  name: string
  prism: string
  deckString: string
  cardCount: number
  isStarter: boolean
}

export interface CloudPlayerState {
  profile: {
    level: number
    xp: number
    nextLevelXp: number
    createdAt: string
  }
  basicSkyPass: {
    level: number
    xp: number
    nextLevelXp: number
  }
  tutorialCompleted: boolean
  quests: CloudPlayerQuest[]
  collection: {
    basicCards: CloudPlayerCard[]
    basicCardCount: number
  }
  decks: CloudPlayerDeck[]
}

export interface CloudAppData {
  session: AuthenticatedIdentitySession
  player: CloudPlayerState
  wallets: WalletConnection[]
}
