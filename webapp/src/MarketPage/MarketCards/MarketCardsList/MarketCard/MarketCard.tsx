import clsx from 'clsx'
import { memo, useCallback } from 'react'
import { push } from 'redux-first-history'

import { Card } from '~/shared/components/Card/Card'
import { CardType } from '~/shared/constants/cards'
import { makeMarketCardDetailsRoute } from '~/shared/helpers/routes/market-page'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { useCartItem } from '~/shared/queries/useCart'
import { useDispatch } from '~/shared/redux'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { useMarketCardsShopMode } from '../../../shared/hooks/useMarketCardsShopMode'
import { MarketCardSelectedStyle } from './MarketCard.css'
import { MarketCardBalance } from './MarketCardBalance/MarketCardBalance'

const OverlayPadding = { top: 83, left: 0, right: 0, bottom: 0 } as const

export interface MarketCardProps {
  id: number
}

export const MarketCard = memo(({ id }: MarketCardProps) => {
  const dispatch = useDispatch()
  const mode = useMarketCardsShopMode()
  const { getAssetUrl } = useGetAssetContext()

  const { data: cartItem } = useCartItem(id, mode)

  const onCardClick = useCallback(
    (card: CardType) => {
      dispatch(push(makeMarketCardDetailsRoute(card.id)))
    },
    [dispatch]
  )

  return (
    <div
      className={Sprinkles({
        width: 'full',
        position: 'relative'
      })}
    >
      <Card
        id={id}
        onClick={onCardClick}
        isOverlayEnabled
        BalanceAndPriceInfo={MarketCardBalance}
        overlayPadding={OverlayPadding}
      />
      {!!getAssetUrl && (
        <div
          className={clsx(
            Sprinkles({ position: 'absolute', opacity: 0 }),
            MarketCardSelectedStyle,
            { isSelected: !!cartItem }
          )}
        >
          <img
            src={getAssetUrl('webapp/cards/full-cards/frame-highlight.webp')}
            className={Sprinkles({ width: 'full' })}
          />
        </div>
      )}
    </div>
  )
})

MarketCard.displayName = 'MarketCard'
