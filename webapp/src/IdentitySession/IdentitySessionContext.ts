import { createContext, useContext } from 'react'

import type {
  IdentitySession,
  PlayerState
} from '~/clients/IdentityClient/IdentityClient'
import type { Account } from '~/lib/proto'

export type AuthenticatedIdentitySession = Extract<
  IdentitySession,
  { authenticated: true }
>

export interface IdentitySessionValue {
  session: AuthenticatedIdentitySession
  player: PlayerState
  account: Account
  identityReference: string
}

export const IdentitySessionContext = createContext<IdentitySessionValue | undefined>(
  undefined
)

export const useIdentitySession = (): IdentitySessionValue => {
  const value = useContext(IdentitySessionContext)
  if (!value) throw new Error('Identity session is not available in this app mode.')
  return value
}

export const identityReferenceFor = (userId: string) => `identity:${userId}`
