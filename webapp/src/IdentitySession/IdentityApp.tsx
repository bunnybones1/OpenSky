import { memo } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import AccountPage from '~/AccountPage/AccountPage'
import AppLayout from '~/AppLayout/AppLayout'
import DeletedAccountPage from '~/components/DeletedAccountPage'
import FourOhFourPage from '~/components/FourOhFourPage'
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
          <Route element={<AccountPage />} path={ROUTES_CONFIG.routes.ACCOUNT.path} />
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
