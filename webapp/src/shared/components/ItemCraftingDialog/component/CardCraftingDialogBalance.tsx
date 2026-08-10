import { ItemType } from '@opensky/proto'
import clsx from 'clsx'
import { memo, useMemo } from 'react'

import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { useTokenBalance } from '~/shared/queries/useTokenBalances'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  BalanceOrPrice,
  ItemBalanceAndPriceInfo
} from '../../ItemBalanceAndPriceInfo/ItemBalanceAndPriceInfo'
import { CardCraftingDialogBalanceStyle } from './CardCraftingDialogBalance.css'

interface CardCraftingDialogBalanceProps {
  id: number
}

export const CardCraftingDialogBalance = memo(
  ({ id }: CardCraftingDialogBalanceProps) => {
    const { data: baseBalances } = useTokenBalance(ItemType.SW_BASE_CARDS, id)
    const { getAssetUrl } = useGetAssetContext()

    const balances = useMemo<undefined | BalanceOrPrice[]>(() => {
      if (baseBalances === undefined) return undefined

      return [
        {
          id: 'BALANCES',
          amount: !baseBalances ? 0 : baseBalances.balance,
          image: !!getAssetUrl
            ? getAssetUrl(`webapp/icons/base-card-with-letter.webp`)
            : undefined
        }
      ]
    }, [baseBalances, getAssetUrl])

    return (
      <ItemBalanceAndPriceInfo<number>
        className={clsx(Sprinkles({ opacity: 1 }), CardCraftingDialogBalanceStyle)}
        areBalancesLoading={balances === undefined}
        balances={balances}
        id={id}
      />
    )
  }
)

CardCraftingDialogBalance.displayName = 'CardCraftingDialogBalance'
