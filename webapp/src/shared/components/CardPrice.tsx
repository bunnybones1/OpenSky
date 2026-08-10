import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { Icon } from '~/shared/components/Icon/Icon'
import { Text } from '~/shared/components/Text'
import { formatUSDCBalance } from '~/shared/helpers/market/format-usdc-balance'

import { useTokenPriceAndSupply } from '../queries/useTokenPriceAndSupply'
import { MarketMode } from '../types/market'

interface CardPriceProps {
  quantity: number
  tokenId: number
  mode: MarketMode
  isSubtotal?: boolean
}

export const CardPrice = memo(
  ({ tokenId, mode, quantity, isSubtotal }: CardPriceProps) => {
    const { data: priceAndSupply } = useTokenPriceAndSupply({
      id: tokenId,
      mode,
      quantity
    })

    const { t } = useTranslation()

    return (
      <>
        {priceAndSupply === undefined ? (
          <Icon type="spinner" height="20px" color="white" />
        ) : (
          <Text color="white" fontSize="16px">
            {priceAndSupply?.price
              ? `$${(
                  formatUSDCBalance(priceAndSupply.price) /
                  (!!isSubtotal ? 1 : quantity)
                ).toFixed(2)}`
              : t('generic.NotApplicable')}
          </Text>
        )}
      </>
    )
  }
)

CardPrice.displayName = 'CardPrice'
