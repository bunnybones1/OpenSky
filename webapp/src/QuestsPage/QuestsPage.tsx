import { QuestPeriodicity } from '@opensky/proto'
import clsx from 'clsx'
import { memo } from 'react'
import { Route, Routes } from 'react-router-dom'
import { push } from 'redux-first-history'

import { FancyBackButton } from '~/shared/components/FancyBackButton/FancyBackButton'
import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { useDispatch } from '~/shared/redux/index'
import { Sprinkles } from '~/shared/style/Sprinkles.css'
import { HeightOneHundredVhMinusOffset } from '~/shared/style/TopOffsetStyle.css'

import { QuestsPageSubNav } from './components/QuestsPageSubNav'
import { QuestsList } from './QuestsList/QuestsList'
import { QuestsPageButtonContainer } from './QuestsPage.css'

export const QuestsPage = memo(() => {
  const dispatch = useDispatch()

  return (
    <div
      className={clsx(
        Sprinkles({
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          width: 'full'
        }),
        HeightOneHundredVhMinusOffset
      )}
    >
      <div
        className={clsx(
          Sprinkles({
            position: 'absolute',
            left: 0,
            top: 0,
            zIndex: 5
          }),
          QuestsPageButtonContainer
        )}
      >
        <FancyBackButton
          onClick={() => dispatch(push(ROUTES_CONFIG.routes.HOME.directPath))}
        />
      </div>
      <QuestsPageSubNav />
      <Routes>
        <Route
          element={<QuestsList periodicity={QuestPeriodicity.DAILY} />}
          path={ROUTES_CONFIG.routes.QUESTS.routes.DAILY.path}
        />
        <Route
          element={<QuestsList periodicity={QuestPeriodicity.WEEKLY} />}
          path={ROUTES_CONFIG.routes.QUESTS.routes.WEEKLY.path}
        />
        <Route
          element={<QuestsList periodicity={QuestPeriodicity.SEASONAL} />}
          path={ROUTES_CONFIG.routes.QUESTS.routes.SEASONAL.path}
        />
      </Routes>
    </div>
  )
})

QuestsPage.displayName = 'QuestsPage'
