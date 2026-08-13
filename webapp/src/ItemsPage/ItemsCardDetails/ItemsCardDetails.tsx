import { memo, useCallback, useEffect } from 'react'
import { push } from 'redux-first-history'

import env from '~/env'
import { CardDetailsPage } from '~/shared/components/CardDetailsPage/CardDetailsPage'
import { makeItemsCardDetailsRoute } from '~/shared/helpers/routes/items-page'
import { useDispatch, useSelector } from '~/shared/redux/index'

import { itemsCardDetailsIdSelector } from '../shared/selectors/itemsCardDetailsIdSelector'
import { ItemsCardDetailsControls } from './components/ItemsCardDetailsControls'

export const ItemsCardDetails = memo(() => {
  const id = useSelector(itemsCardDetailsIdSelector)

  const dispatch = useDispatch()

  useEffect(() => window.scrollTo({ top: 0 }), [id])

  const switchCard = useCallback(
    (id: number) => {
      dispatch(push(makeItemsCardDetailsRoute(id)))
    },
    [dispatch]
  )

  if (!id) return null

  return (
    <CardDetailsPage
      Controls={ItemsCardDetailsControls}
      id={id}
      switchCard={switchCard}
      inventoryOnly={env.AUTH_MODE === 'google'}
    />
  )
})

ItemsCardDetails.displayName = 'ItemsCardDetails'
