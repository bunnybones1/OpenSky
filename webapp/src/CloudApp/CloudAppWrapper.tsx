import { memo, useCallback, useEffect, useState } from 'react'
import { BrowserRouter } from 'react-router-dom'

import {
  identityClient,
  type IdentitySession,
  type PlayerState
} from '~/clients/IdentityClient/IdentityClient'
import env from '~/env'

import { CloudApp } from './CloudApp'
import * as styles from './CloudApp.css'

interface Props {
  session: Extract<IdentitySession, { authenticated: true }>
}

export const CloudAppWrapper = memo(({ session }: Props) => {
  const [player, setPlayer] = useState<PlayerState>()
  const [error, setError] = useState<string>()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const loadPlayer = useCallback(() => {
    setError(undefined)
    setPlayer(undefined)
    identityClient
      .bootstrapPlayer()
      .then(setPlayer)
      .catch((nextError) =>
        setError(
          nextError instanceof Error
            ? nextError.message
            : 'Unable to load your Cloud Weasel player.'
        )
      )
  }, [])

  useEffect(loadPlayer, [loadPlayer])

  const launchPractice = useCallback(() => {
    window.location.assign(`${env.GAME_URL}?mode=LOCAL_BOT&skipAuth`)
  }, [])

  const signOut = useCallback(async () => {
    setIsSigningOut(true)
    try {
      await identityClient.signOut()
      window.location.assign('/')
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to sign out.')
      setIsSigningOut(false)
    }
  }, [])

  if (error) {
    return (
      <div className={styles.shell}>
        <div className={styles.errorPanel} role="alert">
          <h1 className={styles.errorTitle}>We could not open your player.</h1>
          <p className={styles.errorText}>{error}</p>
          <div className={styles.actionRow}>
            <button className={styles.primaryButton} onClick={loadPlayer}>
              Try again
            </button>
            <button className={styles.secondaryButton} onClick={signOut}>
              Sign out
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!player) {
    return (
      <div className={styles.loading} role="status" aria-live="polite">
        <div className={styles.loadingInner}>
          <div className={styles.brandMark}>CW</div>
          <div className={styles.loadingText}>Preparing your player…</div>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <CloudApp
        session={session}
        player={player}
        wallets={session.wallets}
        onLaunchPractice={launchPractice}
        onSignOut={signOut}
        isSigningOut={isSigningOut}
      />
    </BrowserRouter>
  )
})

CloudAppWrapper.displayName = 'CloudAppWrapper'

export default CloudAppWrapper
