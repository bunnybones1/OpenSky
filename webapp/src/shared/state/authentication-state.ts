import { proxy } from 'valtio'

export interface IAuthenticationState {
  userAddress?: string
  gamePrincipal?: string
  sentryId?: string
  isInitializing: boolean
}

const DEFAULT_AUTHENTICATION_STATE: IAuthenticationState = {
  userAddress: undefined,
  gamePrincipal: undefined,
  sentryId: undefined,
  isInitializing: true
}

export const authenticationState = proxy(DEFAULT_AUTHENTICATION_STATE)

export const updateAuthenticationState = <T extends keyof IAuthenticationState>(
  key: T,
  value: IAuthenticationState[T]
) => {
  authenticationState[key] = value
}
