import type {
  IdentitySession,
  PlayerCardUnlock,
  PlayerDeck,
  PlayerQuest,
  PlayerState,
  WalletConnection
} from '~/clients/IdentityClient/IdentityClient'

export type AuthenticatedIdentitySession = Extract<
  IdentitySession,
  { authenticated: true }
>

export type CloudPlayerQuest = PlayerQuest
export type CloudPlayerCard = PlayerCardUnlock
export type CloudPlayerDeck = PlayerDeck
export type CloudPlayerState = PlayerState

export interface CloudAppData {
  session: AuthenticatedIdentitySession
  player: CloudPlayerState
  wallets: WalletConnection[]
}
