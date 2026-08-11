import { ThemeProvider } from '@emotion/react'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { HistoryRouter as Router } from 'redux-first-history/rr6'

import { Theme } from '~/__deprecated__/style/Theme'
import App from '~/App'
import {
  identityClient,
  type IdentitySession,
  type PlayerState
} from '~/clients/IdentityClient/IdentityClient'
import type { Account } from '~/lib/proto'
import { GlobalQueryClient } from '~/shared/clients'
import { AuthenticatedPageLoader } from '~/shared/components/AuthenticatedPageLoader'
import { Button } from '~/shared/components/Button'
import { Text } from '~/shared/components/Text'
import { getUseAccountKey } from '~/shared/constants/react-query-keys'
import { history } from '~/shared/redux'
import { updateAuthenticationState } from '~/shared/state/authentication-state'
import { FullWidthButtonStyle } from '~/shared/style/FullWidthButtonStyle.css'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { identityReferenceFor } from './IdentitySessionContext'
import { IdentitySessionProvider } from './IdentitySessionProvider'

interface Props {
  session: Extract<IdentitySession, { authenticated: true }>
}

const accountFor = (
  session: Props['session'],
  player: PlayerState,
  identityReference: string
): Account => ({
  id: 0,
  address: identityReference,
  name: session.user.displayName,
  locale: 'en',
  createdAt: player.profile.createdAt,
  updatedAt: player.profile.createdAt,
  experience: player.profile.xp,
  warmUps: 0,
  level: player.profile.level,
  seasonLevel: player.basicSkyPass.level,
  levelUpXP: player.profile.nextLevelXp,
  isBurnerWallet: false
})

const IdentityAuthenticatedAppWrapper = memo(({ session }: Props) => {
  const [player, setPlayer] = useState<PlayerState>()
  const [error, setError] = useState<string>()

  const loadPlayer = useCallback(() => {
    setError(undefined)
    identityClient
      .bootstrapPlayer()
      .then(setPlayer)
      .catch((nextError) =>
        setError(
          nextError instanceof Error
            ? nextError.message
            : 'Unable to load your player account.'
        )
      )
  }, [])

  useEffect(loadPlayer, [loadPlayer])

  const identityReference = useMemo(
    () => identityReferenceFor(session.user.id),
    [session.user.id]
  )
  const account = useMemo(
    () => (player ? accountFor(session, player, identityReference) : undefined),
    [identityReference, player, session]
  )

  useEffect(() => {
    if (!account) return
    GlobalQueryClient.setQueryData(getUseAccountKey(identityReference), account)
    updateAuthenticationState('userAddress', identityReference)
    updateAuthenticationState('isInitializing', false)
  }, [account, identityReference])

  if (error) {
    return (
      <div
        className={Sprinkles({
          width: 'full',
          height: 'full',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          padding: '24px'
        })}
      >
        <Text color="white" fontSize="22px" fontWeight="700">
          We could not load your player account.
        </Text>
        <Text color="purple9" fontSize="14px" marginTop="12px">
          {error}
        </Text>
        <div
          className={Sprinkles({ width: 'full', marginTop: '24px' })}
          style={{ maxWidth: 260 }}
        >
          <Button
            height="52px"
            colorType="blue"
            frameType="default"
            className={FullWidthButtonStyle}
            buttonClassName={FullWidthButtonStyle}
            onClick={loadPlayer}
            text="Try again"
          />
        </div>
      </div>
    )
  }

  if (!player || !account) return <AuthenticatedPageLoader />

  return (
    <IdentitySessionProvider
      session={session}
      player={player}
      account={account}
      identityReference={identityReference}
    >
      <ThemeProvider theme={Theme}>
        <Router history={history}>
          <App />
        </Router>
      </ThemeProvider>
    </IdentitySessionProvider>
  )
})

IdentityAuthenticatedAppWrapper.displayName = 'IdentityAuthenticatedAppWrapper'

export default IdentityAuthenticatedAppWrapper
