import { isIOSNativeApp } from '@opensky/shared/check-mobile-app-type'
import { isLocalTrackingAllowed } from '@opensky/shared/cookies'
import { lazy, memo, Suspense, useEffect, useLayoutEffect, useRef } from 'react'
import { useSnapshot } from 'valtio'

import env from '~/env'
import { AuthenticatedPageLoader } from '~/shared/components/AuthenticatedPageLoader'
import { load } from '~/shared/helpers/analytics-old'
import {
  initOneSignal,
  isPushNotificationEnabled,
  showNativePrompt
} from '~/shared/helpers/one-signal'
import { captureError } from '~/shared/helpers/sentry'
import { useAuthedAccount } from '~/shared/hooks/useAuthedAccount'
import { authenticationState } from '~/shared/state/authentication-state'

import { AuthenticationPage } from './AuthenticationPage/AuthenticationPage'
import { IndexPageLoader } from './components/IndexPageLoader'
import { useHandleSoundSettings } from './hooks/useHandleSoundSettings'
import { useMuteAudioOnVisibilityChange } from './hooks/useMuteAudioOnVisibility'

const AuthenticatedWrapper = lazy(
  () => import('./components/AuthenticatedAppWrapper.js')
)

export const IndexPage = memo(() => {
  const { data: authedAccount } = useAuthedAccount()
  const { isInitializing } = useSnapshot(authenticationState)
  const isHidden = useRef(false)

  useMuteAudioOnVisibilityChange()
  useHandleSoundSettings()

  useLayoutEffect(() => {
    // TODO: If you see this code, message someone on the game team about their plans to
    // handle this redirect somewhere else, rather than here
    // in the webapp. See: https://github.com/horizon-games/issue-tracker/issues/12173
    if (window.location.pathname.includes('latest/game')) {
      const url = new URL(window.location.href)
      url.pathname = `/game/${env.GITCOMMIT}/`
      window.location.href = url.toString()
    }
  }, [])

  useLayoutEffect(() => {
    const localTrackingAllowed: boolean | undefined = isLocalTrackingAllowed()

    if (!isIOSNativeApp()) {
      load(localTrackingAllowed)
    }
    // Initialize Push notifications
    try {
      if (localTrackingAllowed) {
        initOneSignal().then(() => {
          isPushNotificationEnabled().then((isEnabled) => {
            if (!isEnabled) {
              showNativePrompt()
            }
          })
        })
      }
    } catch (error) {
      console.error('failed to init one signal', error)
      captureError(error, 'failed to init One Signal')
    }
  }, [])

  useEffect(() => {
    const loader = document.getElementById('loader')
    if (
      loader &&
      !isInitializing &&
      !isHidden.current &&
      loader.style.display !== 'none'
    ) {
      loader.style.display = 'none'
      loader.style.pointerEvents = 'none'
      isHidden.current = true
    }
  }, [isInitializing])

  if (isInitializing) return <IndexPageLoader />

  if (env.AUTH_MODE === 'google') return <AuthenticationPage />

  if (!!authedAccount) {
    return (
      <Suspense fallback={<AuthenticatedPageLoader />}>
        <AuthenticatedWrapper />
      </Suspense>
    )
  }

  return <AuthenticationPage />
})

IndexPage.displayName = 'IndexPage'
