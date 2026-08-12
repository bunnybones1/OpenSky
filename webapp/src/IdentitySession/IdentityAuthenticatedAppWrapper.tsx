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
import { APIClient, GlobalQueryClient } from '~/shared/clients'
import { AuthenticatedPageLoader } from '~/shared/components/AuthenticatedPageLoader'
import { Button } from '~/shared/components/Button'
import { Text } from '~/shared/components/Text'
import { getUseAccountKey } from '~/shared/constants/react-query-keys'
import { setExternalUserId } from '~/shared/helpers/one-signal'
import { history } from '~/shared/redux'
import { updateAuthenticationState } from '~/shared/state/authentication-state'
import { FullWidthButtonStyle } from '~/shared/style/FullWidthButtonStyle.css'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { identityReferenceFor } from './IdentitySessionContext'
import { IdentitySessionProvider } from './IdentitySessionProvider'

interface Props {
  session: Extract<IdentitySession, { authenticated: true }>
}

const accountFor = (player: PlayerState, identityReference: string): Account => ({
  id: 0,
  address: identityReference,
  name: player.profile.name,
  locale: player.profile.locale,
  createdAt: player.profile.createdAt,
  updatedAt: player.profile.updatedAt,
  experience: player.profile.xp,
  warmUps: 0,
  level: player.profile.level,
  seasonLevel: player.basicSkyPass.level,
  levelUpXP: player.profile.nextLevelXp,
  region: player.profile.region,
  tagArtID: player.profile.tagArtID,
  titleID: player.profile.titleID,
  isBurnerWallet: false
})

const IdentityAuthenticatedAppWrapper = memo(({ session }: Props) => {
  const [player, setPlayer] = useState<PlayerState>()
  const [canonicalAccount, setCanonicalAccount] = useState<Account>()
  const [isNewPlayer, setIsNewPlayer] = useState(false)
  const [error, setError] = useState<string>()

  const identityReference = useMemo(
    () => identityReferenceFor(session.user.id),
    [session.user.id]
  )

  useEffect(() => {
    setExternalUserId(session.user.id).catch((pushError) => {
      console.error('failed to link Cloud Weasel push identity', pushError)
    })
  }, [session.user.id])

  const loadPlayer = useCallback(() => {
    setError(undefined)
    identityClient
      .bootstrapPlayer()
      .then(({ player: nextPlayer, created }) => {
        setPlayer(nextPlayer)
        setIsNewPlayer(created)
      })
      .catch((nextError) =>
        setError(
          nextError instanceof Error
            ? nextError.message
            : 'Unable to load your player account.'
        )
      )
  }, [])

  useEffect(loadPlayer, [loadPlayer])

  const fallbackAccount = useMemo(
    () => (player ? accountFor(player, identityReference) : undefined),
    [identityReference, player]
  )
  const account = canonicalAccount ?? fallbackAccount

  useEffect(() => {
    if (!player) return
    let cancelled = false
    APIClient.opensky
      .getAccount({ address: identityReference })
      .then(({ account: nextAccount }) => {
        if (!cancelled && nextAccount) setCanonicalAccount(nextAccount)
      })
      .catch(() => {
        // The bootstrap account remains a safe fallback during transient RPC
        // failures; the query layer can retry the canonical request later.
      })
    return () => {
      cancelled = true
    }
  }, [identityReference, player])

  useEffect(() => {
    if (!isNewPlayer || !canonicalAccount || canonicalAccount.invitedBy) return
    const invitedBy = new URLSearchParams(window.location.search).get('invitedBy')
    if (!invitedBy?.startsWith('identity:') || invitedBy === identityReference) {
      return
    }

    let cancelled = false
    APIClient.opensky
      .setInvitedBy({
        req: { address: identityReference, invitedBy }
      })
      .then(() => {
        if (cancelled) return
        const nextAccount = { ...canonicalAccount, invitedBy }
        setCanonicalAccount(nextAccount)
        GlobalQueryClient.setQueryData(
          getUseAccountKey(identityReference),
          nextAccount
        )
        const url = new URL(window.location.href)
        url.searchParams.delete('invitedBy')
        window.history.replaceState(
          null,
          '',
          `${url.pathname}${url.search}${url.hash}`
        )
      })
      .catch(() => {
        // Referral attribution must not block a new player from entering the app.
      })
    return () => {
      cancelled = true
    }
  }, [canonicalAccount, identityReference, isNewPlayer])

  useEffect(() => {
    if (!account) return
    GlobalQueryClient.setQueryData(getUseAccountKey(identityReference), account)
    updateAuthenticationState('userAddress', identityReference)
    updateAuthenticationState('gamePrincipal', session.gamePrincipal)
    updateAuthenticationState('isInitializing', false)
  }, [account, identityReference, session.gamePrincipal])

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
