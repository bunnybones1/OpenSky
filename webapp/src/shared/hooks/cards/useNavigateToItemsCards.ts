import { useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { push } from 'redux-first-history'

import { makeItemsCardsRoute } from '~/shared/helpers/routes/items-page'
import { setItemsCardsFilterState } from '~/shared/state/items-cards/items-cards-filter-state'
import { CardSearchParams } from '~/shared/types/cards'

export const useNavigateToItemsCards = () => {
  const dispatch = useDispatch()

  const navigateToItemsCards = useCallback(
    (filters: CardSearchParams) => {
      setItemsCardsFilterState(filters)
      dispatch(push(makeItemsCardsRoute()))
    },
    [dispatch]
  )

  return { navigateToItemsCards }
}
