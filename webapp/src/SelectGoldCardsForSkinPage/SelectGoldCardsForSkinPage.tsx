import { memo, useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'

import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { resetSelectGoldsFilterState } from '~/shared/state/select-golds/select-golds-filter-state'
import { resetSelectGoldsState } from '~/shared/state/select-golds/select-golds-state'

import { SelectGoldsCardDetails } from './SelectGoldsCardDetails/SelectGoldsCardDetails'
import { SelectGoldsCards } from './SelectGoldsCards/SelectGoldsCards'

export const SelectGoldCardsForSkinPage = memo(() => {
  useEffect(() => {
    return () => {
      resetSelectGoldsFilterState()
      resetSelectGoldsState()
    }
  }, [])

  return (
    <Routes>
      <Route
        element={<SelectGoldsCards />}
        path={ROUTES_CONFIG.routes.SELECT_GOLDS.routes.CARDS.path}
      />
      <Route
        element={<SelectGoldsCardDetails />}
        path={ROUTES_CONFIG.routes.SELECT_GOLDS.routes.CARD_DETAILS.path}
      />
    </Routes>
  )
})

SelectGoldCardsForSkinPage.displayName = 'SelectGoldCardsForSkinPage'
