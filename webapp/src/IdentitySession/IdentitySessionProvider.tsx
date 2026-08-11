import { memo, ReactNode, useMemo } from 'react'

import {
  IdentitySessionContext,
  type IdentitySessionValue
} from './IdentitySessionContext'

interface Props extends IdentitySessionValue {
  children: ReactNode
}

export const IdentitySessionProvider = memo(
  ({ account, children, identityReference, player, session }: Props) => {
    const value = useMemo<IdentitySessionValue>(
      () => ({ account, identityReference, player, session }),
      [account, identityReference, player, session]
    )
    return (
      <IdentitySessionContext.Provider value={value}>
        {children}
      </IdentitySessionContext.Provider>
    )
  }
)

IdentitySessionProvider.displayName = 'IdentitySessionProvider'
