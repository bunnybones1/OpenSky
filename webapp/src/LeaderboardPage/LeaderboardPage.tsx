import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Route, Routes } from 'react-router-dom'

import { SubNavButton } from '~/shared/components/SubNav/exported/SubNavButton'
import { SubNav } from '~/shared/components/SubNav/SubNav'
import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { DeckLeaderboardPage } from './DeckLeaderboardPage/DeckLeaderboardPage'
import { PlayerLeaderboardPage } from './PlayerLeaderboardPage/PlayerLeaderboardPage'

export const LeaderboardPage = memo(() => {
  const { t } = useTranslation()
  return (
    <div
      className={Sprinkles({
        width: 'full',
        height: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'flex-start'
      })}
    >
      <SubNav>
        <SubNavButton
          text={t('ranks.players').toUpperCase()}
          to={ROUTES_CONFIG.routes.LEADERBOARD.routes.PLAYER_LEADERBOARD.directPath}
          id="player-leaderboard"
        />
        <SubNavButton
          text={t('ranks.decks').toUpperCase()}
          to={ROUTES_CONFIG.routes.LEADERBOARD.routes.DECK_LEADERBOARD.directPath}
          id="deck-leaderboard"
        />
      </SubNav>
      <div className={Sprinkles({ width: 'full', paddingY: '16px' })}>
        <Routes>
          <Route
            path={ROUTES_CONFIG.routes.LEADERBOARD.routes.PLAYER_LEADERBOARD.path}
            element={<PlayerLeaderboardPage />}
          />
          <Route
            path={ROUTES_CONFIG.routes.LEADERBOARD.routes.DECK_LEADERBOARD.path}
            element={<DeckLeaderboardPage />}
          />
        </Routes>
      </div>
    </div>
  )
})

LeaderboardPage.displayName = 'LeaderboardPage'
