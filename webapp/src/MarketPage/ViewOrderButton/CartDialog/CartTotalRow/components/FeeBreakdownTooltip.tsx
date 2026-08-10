import clsx from 'clsx'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import {
  FRONTEND_FEE_PERCENTAGE,
  LP_FEE_PERCENTAGE,
  ROYALTY_FEE_PERCENTAGE,
  SLIPPAGE_PERCENTAGE
} from '~/shared/constants/market'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { FeeBreakdownTooltipStyle } from './FeeBreakdownTooltip.css'

export const FeeBreakdownTooltip = memo(() => {
  const { t } = useTranslation()
  return (
    <div
      className={clsx(
        Sprinkles({
          fontSize: '14px',
          color: 'white',
          paddingY: '4px',
          paddingX: '8px'
        }),
        FeeBreakdownTooltipStyle
      )}
      dangerouslySetInnerHTML={{
        __html: t('shop.feeToolTip', {
          marketFee: ROYALTY_FEE_PERCENTAGE + FRONTEND_FEE_PERCENTAGE,
          protocolFee: LP_FEE_PERCENTAGE,
          slippageTolerance: SLIPPAGE_PERCENTAGE
        })
      }}
    />
  )
})

FeeBreakdownTooltip.displayName = 'FeeBreakdownTooltip'
