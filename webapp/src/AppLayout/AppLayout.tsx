import { isIOSNativeApp } from '@opensky/shared/check-mobile-app-type'
import { memo } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useSnapshot } from 'valtio'

import env from '~/env'
import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { authenticationState } from '~/shared/state/authentication-state'

import CookieDisclaimer from './components/CookieDisclaimer'
import ErrorBoundary from './components/ErrorBoundary'
import LandscapeWarning from './components/LandscapeWarning'
import MobileAppPrompt from './components/MobileAppPrompt'
import NetworkWarning from './components/NetworkWarning'
import { PageLayout } from './components/PageLayout'
import PortraitWarning from './components/PortraitWarning'
import UseStateDisclaimerTrigger from './components/USStateDisclaimerTrigger'
import { DeckViewer } from './DeckViewer/DeckViewer'
import { NavBar } from './NavBar/NavBar'
import { Widgets } from './Widgets/Widgets'

const renderCookieDisclaimer = !isIOSNativeApp()
const isIdentityMode = env.AUTH_MODE === 'google'

const AppLayout = memo(() => {
  const { isInitializing } = useSnapshot(authenticationState)

  if (isInitializing) {
    return <Navigate to={ROUTES_CONFIG.directPath} />
  }

  return (
    <>
      <ErrorBoundary>
        {renderCookieDisclaimer && <CookieDisclaimer />}
        <>
          <PortraitWarning />
          <LandscapeWarning />
          {!isIdentityMode && <MobileAppPrompt />}
          {!isIdentityMode && <NetworkWarning />}
          {!isIdentityMode && <DeckViewer />}
          <NavBar />
          {!isIdentityMode && <Widgets />}
          {!isIdentityMode && <UseStateDisclaimerTrigger />}
          <PageLayout>
            <Outlet />
          </PageLayout>
        </>
      </ErrorBoundary>
    </>
  )
})

export default AppLayout

AppLayout.displayName = 'AppLayout'
