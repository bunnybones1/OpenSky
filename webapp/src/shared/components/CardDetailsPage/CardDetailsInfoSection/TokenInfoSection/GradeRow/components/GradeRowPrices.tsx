import { SwapType } from '@0xsequence/metadata'
import { ItemType } from '@opensky/proto'
import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Icon } from '~/shared/components/Icon/Icon'
import { ImageIcon } from '~/shared/components/ImageIcon/ImageIcon'
import { Text } from '~/shared/components/Text'
import { Cards } from '~/shared/constants/cards'
import { formatUSDCBalance } from '~/shared/helpers/market/format-usdc-balance'
import { useTokenPriceAndSupply } from '~/shared/queries/useTokenPriceAndSupply'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

interface GradeRowPricesProps {
  id: number
  grade: ItemType.SW_BASE_CARDS | ItemType.SW_GOLD_CARDS | ItemType.SW_SILVER_CARDS
}

export const GradeRowPrices = memo(({ grade, id }: GradeRowPricesProps) => {
  const isBase = grade === ItemType.SW_BASE_CARDS
  const card = useMemo(() => Cards.get(id), [id])

  const isEnchant = card?.type === 'enchant'
  const isToken = card?.prism === 'tok' && !isEnchant

  const { data: buyPriceAndSupply } = useTokenPriceAndSupply({
    id,
    quantity: 1,
    mode: SwapType.BUY,
    isDisabled: isBase || isEnchant || isToken
  })

  const { data: sellPriceAndSupply } = useTokenPriceAndSupply({
    id,
    quantity: 1,
    mode: SwapType.SELL,
    isDisabled: isBase || isEnchant || isToken
  })

  const { t } = useTranslation()

  if (isBase || isToken || isEnchant) {
    return (
      <div
        className={Sprinkles({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start'
        })}
      >
        <Text color="white" fontSize="14px" fontWeight="600">
          {t('generic.NotApplicable')}
        </Text>
      </div>
    )
  }

  return (
    <div
      className={Sprinkles({
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        flexDirection: 'column'
      })}
    >
      <div
        className={Sprinkles({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start'
        })}
      >
        <Text color="white" fontSize="14px" fontWeight="600">
          {`${t('generic.Buy')}:`}
        </Text>
        {buyPriceAndSupply === undefined ? (
          <Icon type="spinner" height="14px" color="white" marginLeft="4px" />
        ) : !!buyPriceAndSupply?.price ? (
          <>
            <ImageIcon type="usdc" height="14px" marginLeft="4px" />
            <Text color="white" fontSize="14px" fontWeight="400" marginLeft="4px">
              {`$${formatUSDCBalance(buyPriceAndSupply.price)}`}
            </Text>
          </>
        ) : (
          <Text color="white" fontSize="14px" fontWeight="400">
            {t('generic.NotApplicable')}
          </Text>
        )}
      </div>
      <div
        className={Sprinkles({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          marginTop: '4px'
        })}
      >
        <Text color="white" fontSize="14px" fontWeight="600">
          {`${t('generic.Sell')}:`}
        </Text>
        {sellPriceAndSupply === undefined ? (
          <Icon type="spinner" height="14px" color="white" marginLeft="4px" />
        ) : !!sellPriceAndSupply?.price ? (
          <>
            <ImageIcon type="usdc" height="14px" marginLeft="4px" />
            <Text color="white" fontSize="14px" fontWeight="400" marginLeft="4px">
              {`$${formatUSDCBalance(sellPriceAndSupply?.price)}`}
            </Text>
          </>
        ) : (
          <Text color="white" fontSize="14px" marginLeft="4px" fontWeight="400">
            {t('generic.NotApplicable')}
          </Text>
        )}
      </div>
    </div>
  )
})

GradeRowPrices.displayName = 'GradeRowPrices'
