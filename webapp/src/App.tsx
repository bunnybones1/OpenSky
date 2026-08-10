import { analytics } from '@opensky/analytics'
import { lazy, memo, Suspense, useCallback, useEffect, useRef } from 'react'
import { Route, Routes } from 'react-router-dom'
import { useMount, useUnmount } from 'react-use'
import { Userpilot } from 'userpilot'
import { useSnapshot } from 'valtio'

import env from '~/env'
import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { captureError } from '~/shared/helpers/sentry'
import { useSelector } from '~/shared/redux'
import { pathNameSelector } from '~/shared/redux/router/selectors'

import AccountPage from './AccountPage/AccountPage.js'
import AppLayout from './AppLayout/AppLayout'
import { IndexRedirect } from './components/IndexRedirect'
import { RouteLoaderComponent } from './components/RouteLoaderComponent'
import { CreateDeckPage } from './CreateDeckPage/CreateDeckPage'
import { DeckBuilder } from './DeckBuilder/DeckBuilder'
import HeroFeaturePage from './HeroFeaturePage/HeroFeaturePage'
import HomePage from './HomePage/HomePage'
import { useAnalytics } from './hooks/useAnalytics.js'
import { useAppDialogs } from './hooks/useAppDialogs/useAppDialogs.js'
import { useUpdatePageOffsets } from './hooks/useUpdatePageOffset.js'
import { useUserPilot } from './hooks/useUserPilot.js'
import ItemsPage from './ItemsPage/ItemsPage'
import { LeaderboardPage } from './LeaderboardPage/LeaderboardPage'
import { MarketPage } from './MarketPage/MarketPage.js'
import PendingGoldsPage from './PendingGoldsPage/PendingGoldsPage'
import PlaygroundPage from './PlaygroundPage/PlaygroundPage'
import { PlayPage } from './PlayPage/PlayPage'
import { PurchaseConquestPage } from './PurchaseConquestPage/PurchaseConquestPage'
import { QuestsPage } from './QuestsPage/QuestsPage'
import { SelectGoldCardsForSkinPage } from './SelectGoldCardsForSkinPage/SelectGoldCardsForSkinPage'
import { SelectSilversPage } from './SelectSilversPage/SelectSilversPage.js'
import { MobileClient } from './shared/clients.js'
import { IS_PREMIUM_SKYPASS_AVAILABLE } from './shared/constants/skypass.js'
import { isSecretShopVisibleForMe } from './shared/helpers/handle-secret-features.js'
import { isLocalHost } from './shared/helpers/is-local-host'
import { useAuthedAccount } from './shared/hooks/useAuthedAccount'
import { useNotifyMobileAccountAddress } from './shared/hooks/useNotifyMobileAccountAddress'
import { authenticationState } from './shared/state/authentication-state.js'
import { ShopPage } from './ShopPage/ShopPage.js'
import SkyPassPage from './SkyPassPage/SkyPassPage.js'
import { SkyPassPurchasePage } from './SkyPassPurchasePage/SkyPassPurchasePage'

const isSecretShopVisible = isSecretShopVisibleForMe()

const CacheInfoPage = lazy(() => import('./CacheInfoPage/CacheInfoPage.js'))
const SecretDebugPage = lazy(() => import('./SecretDebugPage/SecretDebugPage.js'))

const AdminPage = lazy(() => import('./AdminPage/AdminPage.js'))
const AdminCommunity = lazy(
  () => import('./AdminPage/outlets/AdminComunity/AdminComunity.js')
)
const AdminBanners = lazy(
  () =>
    import('./AdminPage/outlets/AdminComunity/outlets/AdminBanners/AdminBanners.js')
)
const AdminQueues = lazy(
  () => import('./AdminPage/outlets/AdminComunity/outlets/AdminQueues/AdminQueues.js')
)
const AdminStreamers = lazy(
  () =>
    import(
      './AdminPage/outlets/AdminComunity/outlets/AdminStreamers/AdminStreamers.js'
    )
)
const AdminNotifications = lazy(
  () =>
    import(
      './AdminPage/outlets/AdminComunity/outlets/AdminNotifications/AdminNotifications.js'
    )
)
const AdminUsers = lazy(() => import('./AdminPage/outlets/AdminUsers/AdminUsers.js'))
const AdminUser = lazy(() => import('./AdminPage/outlets/AdminUser/AdminUser.js'))
const AdminMatches = lazy(() => import('./AdminPage/outlets/AdminMatches.js'))
const AdminSignals = lazy(
  () => import('./AdminPage/outlets/AdminSignals/AdminSignals.js')
)
const AdminPendingGolds = lazy(
  () => import('./AdminPage/outlets/AdminPendingGolds/AdminPendingGolds.js')
)
const SanctionsListPage = lazy(() => import('./components/SanctionsListPage.js'))
const DeletedAccountPage = lazy(() => import('./components/DeletedAccountPage.js'))
const FourOhFourPage = lazy(() => import('./components/FourOhFourPage.js'))

const _isLocalHost = isLocalHost()

// Init Userpilot
if (!!env.USER_PILOT_TOKEN) {
  // eslint-disable-next-line no-console
  console.log('User Pilot Initialized')
  Userpilot.initialize(env.USER_PILOT_TOKEN)
}

const App = memo(() => {
  const { data: authedAccount } = useAuthedAccount()
  const isAdjustInitializedRef = useRef<boolean>(false)
  const { isInitializing, userAddress } = useSnapshot(authenticationState)

  const isSignedIn = !isInitializing && !!userAddress

  const {
    AppUpdateDialog,
    ErrorDialog,
    OfflineDialog,
    SequenceConfirmSignatureDialog,
    CookieSettingsDialog,
    StateConfirmationDialog,
    ConvertToSequenceWalletDialog,
    RenameBurnerAccountDialog
  } = useAppDialogs(authedAccount)

  useAnalytics()

  useUserPilot()

  useUpdatePageOffsets()

  const handleGestureStart = useCallback((e) => {
    e.preventDefault()
  }, [])

  // Notifies the mobile app (if in mobile app env) of the
  // authed users address
  useNotifyMobileAccountAddress()

  useMount(() => {
    document.addEventListener('gesturestart', handleGestureStart)
  })

  useUnmount(() => {
    document.removeEventListener('gesturestart', handleGestureStart)
  })

  useEffect(() => {
    if (!isInitializing) {
      MobileClient.sendSignedInMessage(!!isSignedIn, authedAccount?.name || '')
    }
  }, [authedAccount?.name, isInitializing, isSignedIn])

  useEffect(() => {
    if (!!authedAccount && !isAdjustInitializedRef.current) {
      try {
        isAdjustInitializedRef.current = true
      } catch (e) {
        isAdjustInitializedRef.current = false
        captureError(e, 'Failed to initialize Adjust')
      }
    }
  }, [authedAccount])

  const pathName = useSelector(pathNameSelector)
  useEffect(() => {
    analytics.trackView()
  }, [pathName])

  return (
    <>
      <Routes>
        <Route element={<AppLayout />}>
          <Route element={<IndexRedirect />} index />
          <Route
            element={
              <Suspense fallback={<RouteLoaderComponent />}>
                <SecretDebugPage />
              </Suspense>
            }
            path={ROUTES_CONFIG.routes.SECRET_DEBUG.path}
          />
          <Route element={<HomePage />} path={ROUTES_CONFIG.routes.HOME.path} />
          {!!_isLocalHost && (
            <Route
              element={<PlaygroundPage />}
              path={ROUTES_CONFIG.routes.PLAYGROUND.path}
            />
          )}
          <Route element={<PlayPage />} path={ROUTES_CONFIG.routes.PLAY.path} />
          <Route
            element={<PurchaseConquestPage />}
            path={ROUTES_CONFIG.routes.PURCHASE_CONQUEST.path}
          />
          <Route
            element={<PendingGoldsPage />}
            path={ROUTES_CONFIG.routes.PENDING_GOLDS.path}
          />
          <Route
            element={<SelectSilversPage />}
            path={ROUTES_CONFIG.routes.SELECT_SILVERS.path}
          />
          <Route
            element={<SkyPassPage />}
            path={ROUTES_CONFIG.routes.SKY_PASS.directPath}
          />
          {IS_PREMIUM_SKYPASS_AVAILABLE && (
            <Route
              element={<SkyPassPurchasePage />}
              path={ROUTES_CONFIG.routes.SKY_PASS_PURCHASE.path}
            />
          )}
          <Route
            element={
              <Suspense fallback={<RouteLoaderComponent />}>
                <CacheInfoPage />
              </Suspense>
            }
            path={ROUTES_CONFIG.routes.CACHE_INFO.path}
          />
          {!!isSecretShopVisible && (
            <Route path={ROUTES_CONFIG.routes.SHOP.path} element={<ShopPage />} />
          )}
          <Route
            element={<HeroFeaturePage />}
            path={ROUTES_CONFIG.routes.HERO_FEATURE.path}
          />
          <Route
            element={<SelectGoldCardsForSkinPage />}
            path={ROUTES_CONFIG.routes.SELECT_GOLDS.path}
          />
          <Route
            element={<LeaderboardPage />}
            path={ROUTES_CONFIG.routes.LEADERBOARD.path}
          />
          <Route element={<MarketPage />} path={ROUTES_CONFIG.routes.MARKET.path} />
          <Route element={<ItemsPage />} path={ROUTES_CONFIG.routes.ITEMS.path} />
          <Route
            element={<DeckBuilder />}
            path={ROUTES_CONFIG.routes.DECK_BUILDER.path}
          />
          <Route element={<QuestsPage />} path={ROUTES_CONFIG.routes.QUESTS.path} />
          <Route
            element={<CreateDeckPage />}
            path={ROUTES_CONFIG.routes.CREATE_DECK.path}
          />
          <Route path={ROUTES_CONFIG.routes.ACCOUNT.path} element={<AccountPage />} />
          <Route
            path={ROUTES_CONFIG.routes.ADMIN.path}
            element={
              <Suspense fallback={<RouteLoaderComponent />}>
                <AdminPage />
              </Suspense>
            }
          >
            <Route
              path={ROUTES_CONFIG.routes.ADMIN.routes.COMMUNITY.path}
              element={
                <Suspense fallback={<RouteLoaderComponent />}>
                  <AdminCommunity />
                </Suspense>
              }
            >
              <Route
                path={ROUTES_CONFIG.routes.ADMIN.routes.COMMUNITY.routes.BANNERS.path}
                element={
                  <Suspense fallback={<RouteLoaderComponent />}>
                    <AdminBanners />
                  </Suspense>
                }
              />
              <Route
                path={ROUTES_CONFIG.routes.ADMIN.routes.COMMUNITY.routes.QUEUES.path}
                element={
                  <Suspense fallback={<RouteLoaderComponent />}>
                    <AdminQueues />
                  </Suspense>
                }
              />
              <Route
                path={
                  ROUTES_CONFIG.routes.ADMIN.routes.COMMUNITY.routes.STREAMERS.path
                }
                element={
                  <Suspense fallback={<RouteLoaderComponent />}>
                    <AdminStreamers />
                  </Suspense>
                }
              />
              <Route
                path={
                  ROUTES_CONFIG.routes.ADMIN.routes.COMMUNITY.routes.NOTIFICATIONS
                    .path
                }
                element={
                  <Suspense fallback={<RouteLoaderComponent />}>
                    <AdminNotifications />
                  </Suspense>
                }
              />
            </Route>
            <Route
              path={ROUTES_CONFIG.routes.ADMIN.routes.USERS.path}
              element={
                <Suspense fallback={<RouteLoaderComponent />}>
                  <AdminUsers />
                </Suspense>
              }
            />
            <Route
              path={ROUTES_CONFIG.routes.ADMIN.routes.USER.path}
              element={
                <Suspense fallback={<RouteLoaderComponent />}>
                  <AdminUser />
                </Suspense>
              }
            />
            <Route
              path={ROUTES_CONFIG.routes.ADMIN.routes.MATCHES.path}
              element={
                <Suspense fallback={<RouteLoaderComponent />}>
                  <AdminMatches />
                </Suspense>
              }
            />
            <Route
              path={ROUTES_CONFIG.routes.ADMIN.routes.SIGNALS.path}
              element={
                <Suspense fallback={<RouteLoaderComponent />}>
                  <AdminSignals />
                </Suspense>
              }
            />
            <Route
              path={ROUTES_CONFIG.routes.ADMIN.routes.PENDING_GOLDS.path}
              element={
                <Suspense fallback={<RouteLoaderComponent />}>
                  <AdminPendingGolds />
                </Suspense>
              }
            />
          </Route>
          <Route
            path={ROUTES_CONFIG.routes.SANCTIONS_LIST.path}
            element={
              <Suspense fallback={<RouteLoaderComponent />}>
                <SanctionsListPage />
              </Suspense>
            }
          />
          <Route
            path={ROUTES_CONFIG.routes.DELETED_ACCOUNT.path}
            element={
              <Suspense fallback={<RouteLoaderComponent />}>
                <DeletedAccountPage />
              </Suspense>
            }
          />
          <Route
            path="*"
            element={
              <Suspense fallback={<RouteLoaderComponent />}>
                <FourOhFourPage />
              </Suspense>
            }
          />
        </Route>
      </Routes>
      {AppUpdateDialog}
      {ErrorDialog}
      {SequenceConfirmSignatureDialog}
      {CookieSettingsDialog}
      {StateConfirmationDialog}
      {ConvertToSequenceWalletDialog}
      {OfflineDialog}
      {RenameBurnerAccountDialog}
    </>
  )
})

export default App

App.displayName = 'App'
