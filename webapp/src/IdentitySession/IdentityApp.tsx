import { lazy, memo, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import AccountPage from '~/AccountPage/AccountPage'
import AppLayout from '~/AppLayout/AppLayout'
import DeletedAccountPage from '~/components/DeletedAccountPage'
import FourOhFourPage from '~/components/FourOhFourPage'
import { RouteLoaderComponent } from '~/components/RouteLoaderComponent'
import { CreateDeckPage } from '~/CreateDeckPage/CreateDeckPage'
import { DeckBuilder } from '~/DeckBuilder/DeckBuilder'
import HeroFeaturePage from '~/HeroFeaturePage/HeroFeaturePage'
import HomePage from '~/HomePage/HomePage'
import InviteFriendsPage from '~/InviteFriendsPage/InviteFriendsPage'
import InviteAFriendRewards from '~/InviteFriendsPage/outlets/InviteAFriendRewards'
import InvitedFriends from '~/InviteFriendsPage/outlets/InvitedFriends/InvitedFriends'
import ItemsPage from '~/ItemsPage/ItemsPage'
import { LeaderboardPage } from '~/LeaderboardPage/LeaderboardPage'
import PendingGoldsPage from '~/PendingGoldsPage/PendingGoldsPage'
import { PlayPage } from '~/PlayPage/PlayPage'
import { QuestsPage } from '~/QuestsPage/QuestsPage'
import { SelectGoldCardsForSkinPage } from '~/SelectGoldCardsForSkinPage/SelectGoldCardsForSkinPage'
import { SelectSilversPage } from '~/SelectSilversPage/SelectSilversPage'
import { ROUTES_CONFIG } from '~/shared/constants/routes'
import SkyPassPage from '~/SkyPassPage/SkyPassPage'
import { SkyPassPurchasePage } from '~/SkyPassPurchasePage/SkyPassPurchasePage'

import { IdentityCapabilityPage } from './components/IdentityCapabilityPage'
import { useIdentityAppShell } from './useIdentityAppShell'

const AdminPage = lazy(() => import('~/AdminPage/AdminPage'))
const CacheInfoPage = lazy(() => import('~/CacheInfoPage/CacheInfoPage'))
const AdminCommunity = lazy(
  () => import('~/AdminPage/outlets/AdminComunity/AdminComunity')
)
const AdminBanners = lazy(
  () => import('~/AdminPage/outlets/AdminComunity/outlets/AdminBanners/AdminBanners')
)
const AdminQueues = lazy(
  () => import('~/AdminPage/outlets/AdminComunity/outlets/AdminQueues/AdminQueues')
)
const AdminStreamers = lazy(
  () =>
    import('~/AdminPage/outlets/AdminComunity/outlets/AdminStreamers/AdminStreamers')
)
const AdminNotifications = lazy(
  () =>
    import('~/AdminPage/outlets/AdminComunity/outlets/AdminNotifications/AdminNotifications')
)
const AdminUsers = lazy(() => import('~/AdminPage/outlets/AdminUsers/AdminUsers'))
const AdminUser = lazy(() => import('~/AdminPage/outlets/AdminUser/AdminUser'))
const AdminMatches = lazy(() => import('~/AdminPage/outlets/AdminMatches'))
const AdminSignals = lazy(
  () => import('~/AdminPage/outlets/AdminSignals/AdminSignals')
)
const AdminPendingGolds = lazy(
  () => import('~/AdminPage/outlets/AdminPendingGolds/AdminPendingGolds')
)

export const IdentityApp = memo(() => {
  const { ErrorDialog, CookieSettingsDialog, OfflineDialog } = useIdentityAppShell()

  return (
    <>
      <Routes>
        <Route element={<AppLayout />}>
          <Route
            index
            element={<Navigate to={ROUTES_CONFIG.routes.HOME.directPath} replace />}
          />
          <Route element={<HomePage />} path={ROUTES_CONFIG.routes.HOME.path} />
          <Route element={<PlayPage />} path={ROUTES_CONFIG.routes.PLAY.path} />
          <Route
            element={
              <Navigate
                to={ROUTES_CONFIG.routes.SELECT_SILVERS.routes.CARDS.directPath}
                replace
              />
            }
            path={ROUTES_CONFIG.routes.PURCHASE_CONQUEST.path}
          />
          <Route
            element={<SelectSilversPage />}
            path={ROUTES_CONFIG.routes.SELECT_SILVERS.path}
          />
          <Route
            element={<SelectGoldCardsForSkinPage />}
            path={ROUTES_CONFIG.routes.SELECT_GOLDS.path}
          />
          <Route
            element={<PendingGoldsPage />}
            path={ROUTES_CONFIG.routes.PENDING_GOLDS.path}
          />
          <Route element={<ItemsPage />} path={ROUTES_CONFIG.routes.ITEMS.path} />
          <Route
            element={<HeroFeaturePage />}
            path={ROUTES_CONFIG.routes.HERO_FEATURE.path}
          />
          <Route
            element={<CreateDeckPage />}
            path={ROUTES_CONFIG.routes.CREATE_DECK.path}
          />
          <Route
            element={<DeckBuilder />}
            path={ROUTES_CONFIG.routes.DECK_BUILDER.path}
          />
          <Route element={<QuestsPage />} path={ROUTES_CONFIG.routes.QUESTS.path} />
          <Route
            element={<InviteFriendsPage />}
            path={ROUTES_CONFIG.routes.INVITE_FRIENDS.path}
          >
            <Route
              index
              element={
                <Navigate
                  to={ROUTES_CONFIG.routes.INVITE_FRIENDS.routes.REWARDS.directPath}
                  replace
                />
              }
            />
            <Route
              element={<InviteAFriendRewards />}
              path={ROUTES_CONFIG.routes.INVITE_FRIENDS.routes.REWARDS.path}
            />
            <Route
              element={<InvitedFriends />}
              path={ROUTES_CONFIG.routes.INVITE_FRIENDS.routes.INVITED.path}
            />
          </Route>
          <Route
            element={<SkyPassPage />}
            path={ROUTES_CONFIG.routes.SKY_PASS.directPath}
          />
          <Route
            element={<SkyPassPurchasePage />}
            path={ROUTES_CONFIG.routes.SKY_PASS_PURCHASE.path}
          />
          <Route
            element={
              <Suspense fallback={<RouteLoaderComponent />}>
                <CacheInfoPage />
              </Suspense>
            }
            path={ROUTES_CONFIG.routes.CACHE_INFO.path}
          />
          <Route element={<AccountPage />} path={ROUTES_CONFIG.routes.ACCOUNT.path} />
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
            path={ROUTES_CONFIG.routes.LEADERBOARD.path}
            element={<LeaderboardPage />}
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
            path={ROUTES_CONFIG.routes.DELETED_ACCOUNT.path}
            element={<DeletedAccountPage />}
          />
          <Route path="*" element={<FourOhFourPage />} />
        </Route>
      </Routes>
      {ErrorDialog}
      {CookieSettingsDialog}
      {OfflineDialog}
    </>
  )
})

IdentityApp.displayName = 'IdentityApp'
