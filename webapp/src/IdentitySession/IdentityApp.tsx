import { memo } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import AccountPage from '~/AccountPage/AccountPage'
import AppLayout from '~/AppLayout/AppLayout'
import HomePage from '~/HomePage/HomePage'
import ItemsPage from '~/ItemsPage/ItemsPage'
import { PlayPage } from '~/PlayPage/PlayPage'
import { QuestsPage } from '~/QuestsPage/QuestsPage'
import { ROUTES_CONFIG } from '~/shared/constants/routes'
import SkyPassPage from '~/SkyPassPage/SkyPassPage'

import { IdentityCapabilityPage } from './components/IdentityCapabilityPage'

export const IdentityApp = memo(() => (
  <Routes>
    <Route element={<AppLayout />}>
      <Route
        index
        element={<Navigate to={ROUTES_CONFIG.routes.HOME.directPath} replace />}
      />
      <Route element={<HomePage />} path={ROUTES_CONFIG.routes.HOME.path} />
      <Route element={<PlayPage />} path={ROUTES_CONFIG.routes.PLAY.path} />
      <Route element={<ItemsPage />} path={ROUTES_CONFIG.routes.ITEMS.path} />
      <Route element={<QuestsPage />} path={ROUTES_CONFIG.routes.QUESTS.path} />
      <Route
        element={<SkyPassPage />}
        path={ROUTES_CONFIG.routes.SKY_PASS.directPath}
      />
      <Route element={<AccountPage />} path={ROUTES_CONFIG.routes.ACCOUNT.path} />
      <Route
        path={ROUTES_CONFIG.routes.LEADERBOARD.path}
        element={
          <IdentityCapabilityPage
            title="Ranks"
            description="The original leaderboard is preserved here while its account and match APIs are ported."
            icon="leaderboard"
          />
        }
      />
      <Route
        path={ROUTES_CONFIG.routes.MARKET.path}
        element={
          <IdentityCapabilityPage
            title="Market"
            description="The original market remains part of the product. Trading will return with optional WalletConnect support."
            icon="shop"
          />
        }
      />
      <Route
        path="*"
        element={<Navigate to={ROUTES_CONFIG.routes.HOME.directPath} replace />}
      />
    </Route>
  </Routes>
))

IdentityApp.displayName = 'IdentityApp'
