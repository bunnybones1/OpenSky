import { SwapType } from '@0xsequence/metadata'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { ToggleButton } from '~/shared/components/ToggleButton'
import { ToggleButtonGroup } from '~/shared/components/ToggleButtonGroup'
import { MarketMode } from '~/shared/types/market'

interface SideSwitcherProps {
  mode?: MarketMode
  onChange: (value: MarketMode) => void
}

export const SideSwitcher = memo(({ mode, onChange }: SideSwitcherProps) => {
  const { t } = useTranslation()

  if (!mode) return null

  return (
    <ToggleButtonGroup
      height="36px"
      colorType="default"
      value={mode}
      onChange={onChange}
    >
      <ToggleButton value={SwapType.BUY} text={t('generic.Buy')} />
      <ToggleButton value={SwapType.SELL} text={t('generic.Sell')} />
    </ToggleButtonGroup>
  )
})

SideSwitcher.displayName = 'SideSwitcher'
