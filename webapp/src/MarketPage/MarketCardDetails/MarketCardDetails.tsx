import { memo, useCallback, useMemo } from 'react'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { CardDetailsPage } from '~/shared/components/CardDetailsPage/CardDetailsPage'
import { makeMarketCardDetailsRoute } from '~/shared/helpers/routes/market-page'
import { useDispatch, useSelector } from '~/shared/redux/index'
import { marketCardsFilterState } from '~/shared/state/market-cards/market-cards-filter-state'

import { marketCardDetailsIdSelector } from '../shared/selectors/marketCardDetailsIdSelector'
import { MarketCardDetailsControls } from './components/MarketCardDetailsControls'

export const MarketCardDetails = memo(() => {
  const id = useSelector(marketCardDetailsIdSelector)
  const { grade } = useSnapshot(marketCardsFilterState)
  const dispatch = useDispatch()

  const switchCard = useCallback(
    (_id: number) => {
      dispatch(push(makeMarketCardDetailsRoute(_id)))
    },
    [dispatch]
  )

  const allowedGrades = useMemo(() => {
    // eslint-disable-next-line valtio/state-snapshot-rule
    return [grade]
  }, [grade])

  if (!id) return null

  return (
    <CardDetailsPage
      Controls={MarketCardDetailsControls}
      id={id}
      allowedGrades={allowedGrades}
      switchCard={switchCard}
    />
  )
})

MarketCardDetails.displayName = 'MarketCardDetails'
