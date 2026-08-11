import { GameMode } from '@opensky/proto'
import clsx from 'clsx'
import { memo, useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, Route, Routes } from 'react-router-dom'
import { push } from 'redux-first-history'

import env from '~/env'
import { ToggleButton } from '~/shared/components/ToggleButton'
import { ToggleButtonGroup } from '~/shared/components/ToggleButtonGroup'
import { GameType } from '~/shared/constants/ranks'
import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { useIsInQueue } from '~/shared/hooks/useIsInQueue'
import { useDispatch } from '~/shared/redux/index'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { GameModeDescription } from '../shared/components/GameModeDescription'
import { GameModeHeader } from '../shared/components/GameModeHeader/GameModeHeader'
import { PlayPageBackground } from '../shared/components/PlayPageBackground'
import { PlayPageInner } from '../shared/components/PlayPageInner'
import { SharedPlayPageStyle } from '../shared/style/SharedPlayPageStyle.css'
import { IdentityPracticeVsBotPage } from './components/IdentityPracticeVsBotPage'
import { PracticeVsBotPage } from './components/PracticeVsBotPage'
import { PracticeVsPlayerPage } from './components/PracticeVsPlayerPage'
import { PracticeToggleButton } from './Practice.css'

type ValidPracticeGameModes = GameMode.CHALLENGE_CONSTRUCTED | GameMode.PRACTICE_BOT

export const Practice = memo(() => {
  const isIdentityMode = env.AUTH_MODE === 'google'
  const [mode, setMode] = useState<ValidPracticeGameModes>(
    window.location.pathname.includes('player')
      ? GameMode.CHALLENGE_CONSTRUCTED
      : GameMode.PRACTICE_BOT
  )
  const [gameType, setGameType] = useState<GameType>(GameType.CONSTRUCTED)

  const { isInQueue } = useIsInQueue()

  const dispatch = useDispatch()
  const { t } = useTranslation()

  const onTypeToggle = useCallback(
    (newMode: ValidPracticeGameModes) => {
      dispatch(
        push(
          newMode === GameMode.PRACTICE_BOT
            ? ROUTES_CONFIG.routes.PLAY.routes.PRACTICE.routes.BOT.directPath
            : ROUTES_CONFIG.routes.PLAY.routes.PRACTICE.routes.PLAYER.directPath
        )
      )
      setGameType(GameType.CONSTRUCTED)
      setMode(newMode)
    },
    [dispatch]
  )

  return (
    <div
      className={clsx(
        Sprinkles({
          width: 'full',
          height: 'auto',
          position: 'relative',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center'
        }),
        SharedPlayPageStyle
      )}
    >
      <PlayPageBackground
        bgUrl={`webapp/backgrounds/${
          mode === GameMode.PRACTICE_BOT ? 'practice' : 'private'
        }.webp`}
      />

      <PlayPageInner
        bgUrl={`webapp/backgrounds/${
          mode === GameMode.PRACTICE_BOT ? 'practice' : 'private'
        }.webp`}
        isDiscovery={gameType === GameType.DISCOVERY}
      >
        <GameModeHeader
          page="PRACTICE"
          title={t('play.gameModes.header.PRACTICE')}
          hideButton={isIdentityMode}
        />
        <GameModeDescription description={t('playPage.PRACTICE.description')} />
        {!isIdentityMode && (
          <div
            className={Sprinkles({
              width: 'full',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              marginTop: '16px'
            })}
          >
            <ToggleButtonGroup
              height="36px"
              colorType="default"
              value={mode}
              onChange={onTypeToggle}
            >
              <ToggleButton
                className={PracticeToggleButton}
                value={GameMode.PRACTICE_BOT}
                text={t('general.BOT')}
                disabled={isInQueue}
              />
              <ToggleButton
                className={PracticeToggleButton}
                value={GameMode.CHALLENGE_CONSTRUCTED}
                text={t('general.PVP')}
                disabled={isInQueue}
              />
            </ToggleButtonGroup>
          </div>
        )}
        <Routes>
          <Route
            path={ROUTES_CONFIG.routes.PLAY.routes.PRACTICE.routes.BOT.path}
            element={
              isIdentityMode ? <IdentityPracticeVsBotPage /> : <PracticeVsBotPage />
            }
          />
          {isIdentityMode ? (
            <Route
              path="*"
              element={
                <Navigate
                  to={ROUTES_CONFIG.routes.PLAY.routes.PRACTICE.routes.BOT.directPath}
                  replace
                />
              }
            />
          ) : (
            <Route
              path={ROUTES_CONFIG.routes.PLAY.routes.PRACTICE.routes.PLAYER.path}
              element={<PracticeVsPlayerPage setParentGameType={setGameType} />}
            />
          )}
        </Routes>
      </PlayPageInner>
    </div>
  )
})

Practice.displayName = 'Practice'
