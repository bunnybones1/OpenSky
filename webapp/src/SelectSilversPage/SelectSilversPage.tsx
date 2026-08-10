import { memo, useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'

import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { resetSelectSilversFilterState } from '~/shared/state/select-silvers/select-silvers-filter-state'
import { resetSelectSilversState } from '~/shared/state/select-silvers/select-silvers-state'

import { SelectSilversCardDetails } from './SelectSilversCardDetails/SelectSilversCardDetails'
import { SelectSilversCards } from './SelectSilversCards/SelectSilversCards'

export const SelectSilversPage = memo(() => {
  useEffect(() => {
    return () => {
      resetSelectSilversFilterState()
      resetSelectSilversState()
    }
  }, [])

  return (
    <Routes>
      <Route
        element={<SelectSilversCards />}
        path={ROUTES_CONFIG.routes.SELECT_SILVERS.routes.CARDS.path}
      />
      <Route
        element={<SelectSilversCardDetails />}
        path={ROUTES_CONFIG.routes.SELECT_SILVERS.routes.CARD_DETAILS.path}
      />
    </Routes>
  )
})

SelectSilversPage.displayName = 'SelectSilversPage'
