import clsx from 'clsx'
import { memo } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import env from '~/env'
import { Footer } from '~/shared/components/Footer/Footer'
import { LiveTwitchChannels } from '~/shared/components/LiveTwitchChannels/LiveTwitchChannels'
import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { PagePaddingStyle } from '~/shared/style/PagePaddingStyle.css'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { Conquest } from './Conquest/Conquest'
import { PlayPageStyle } from './PlayPage.css'
import { Practice } from './Practice/Practice'
import { Ranked } from './Ranked/Ranked'
import { Tutorial } from './Tutorial/Tutorial'

export const PlayPage = memo(() => {
  const isIdentityMode = env.AUTH_MODE === 'google'

  return (
    <div
      className={clsx(
        Sprinkles({
          display: 'flex',
          height: 'auto',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          flexWrap: 'nowrap',
          overflow: 'hidden'
        }),
        PagePaddingStyle,
        PlayPageStyle
      )}
    >
      <Routes>
        {isIdentityMode ? (
          <>
            <Route
              element={<Practice />}
              path={ROUTES_CONFIG.routes.PLAY.routes.PRACTICE.path}
            />
            <Route
              path="*"
              element={
                <Navigate
                  to={ROUTES_CONFIG.routes.PLAY.routes.PRACTICE.routes.BOT.directPath}
                  replace
                />
              }
            />
          </>
        ) : (
          <>
            <Route
              element={<Tutorial />}
              path={ROUTES_CONFIG.routes.PLAY.routes.TUTORIAL.path}
            />
            <Route
              element={<Ranked />}
              path={ROUTES_CONFIG.routes.PLAY.routes.RANKED.path}
            />
            <Route
              element={<Practice />}
              path={ROUTES_CONFIG.routes.PLAY.routes.PRACTICE.path}
            />
            <Route
              element={<Conquest />}
              path={ROUTES_CONFIG.routes.PLAY.routes.CONQUEST.path}
            />
          </>
        )}
      </Routes>
      <div className={Sprinkles({ width: 'full', marginTop: 'auto' })}>
        <LiveTwitchChannels />
        <Footer />
      </div>
    </div>
  )
})

PlayPage.displayName = 'PlayPage'
