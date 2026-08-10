import { getItemType } from '@opensky/shared/assetsIDs'
import { memo, useCallback, useMemo } from 'react'
import { push } from 'redux-first-history'

import { Card } from '~/shared/components/Card/Card'
import { CardType } from '~/shared/constants/cards'
import { makeItemsCardDetailsRoute } from '~/shared/helpers/routes/items-page'
import { useMarkCardsNotNew } from '~/shared/mutations/useMarkCardsNotNew'
import { useTokenBalance } from '~/shared/queries/useTokenBalances'
import { useDispatch } from '~/shared/redux'

import { ItemsCardBalance } from './components/ItemsCardBalance'
import { ItemsCardNewTag } from './components/ItemsCardNewTag'

const OverlayPadding = { top: 83, left: 0, right: 0, bottom: 0 } as const

export interface ItemsCardProps {
  id: number
}

export const ItemsCard = memo(({ id }: ItemsCardProps) => {
  const { data: balance } = useTokenBalance(getItemType(id), id)

  const isNew = useMemo(() => {
    return !!balance?.isNew
  }, [balance])

  const dispatch = useDispatch()

  const markTokenNotNew = useMarkCardsNotNew()

  const onHover = useCallback(() => {
    markTokenNotNew.mutate([id])
  }, [id, markTokenNotNew])

  const onCardClick = useCallback(
    (card: CardType) => {
      dispatch(push(makeItemsCardDetailsRoute(card.id)))
    },
    [dispatch]
  )

  return (
    <Card
      onHover={isNew ? onHover : undefined}
      id={id}
      isTiltable
      onClick={onCardClick}
      isOverlayEnabled
      isLocked={!balance || balance.balance === 0}
      showLoadingFrame
      overlayPadding={OverlayPadding}
      BalanceAndPriceInfo={ItemsCardBalance}
      NewBadge={isNew ? ItemsCardNewTag : undefined}
    />
  )
})

ItemsCard.displayName = 'ItemsCard'
