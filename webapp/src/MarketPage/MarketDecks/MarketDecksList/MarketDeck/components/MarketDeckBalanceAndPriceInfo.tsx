import clsx from 'clsx'
import { memo } from 'react'

import { ItemBalanceAndPriceInfo } from '~/shared/components/ItemBalanceAndPriceInfo/ItemBalanceAndPriceInfo'
import { formatUSDCBalance } from '~/shared/helpers/market/format-usdc-balance'
import { useDeckCost } from '~/shared/hooks/decks/useDeckCost'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { PriceWrapper, Wrapper } from './MarketDeckBalanceAndPriceInfo.css'

interface MarketDeckBalanceAndPriceInfoProps {
  deckString: string
}

export const MarketDeckBalanceAndPriceInfo = memo(
  ({ deckString }: MarketDeckBalanceAndPriceInfoProps) => {
    const { deckCost } = useDeckCost(deckString)

    return (
      <div
        className={clsx(
          Sprinkles({
            height: 'full',
            width: 'full',
            position: 'absolute',
            left: 0,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            zIndex: 5,
            pointerEvents: 'none'
          }),
          Wrapper
        )}
      >
        <div
          className={clsx(
            Sprinkles({
              height: 'full',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }),
            PriceWrapper
          )}
        >
          <ItemBalanceAndPriceInfo<string>
            id={deckString}
            prices={
              !!deckCost
                ? [
                    {
                      amount: `$${formatUSDCBalance(deckCost)}`,
                      id: 'usdc'
                    }
                  ]
                : undefined
            }
            arePricesLoading={deckCost === undefined}
          />
        </div>
        {/*  */}
      </div>
    )
  }
)

MarketDeckBalanceAndPriceInfo.displayName = 'MarketDeckBalanceAndPriceInfo'
