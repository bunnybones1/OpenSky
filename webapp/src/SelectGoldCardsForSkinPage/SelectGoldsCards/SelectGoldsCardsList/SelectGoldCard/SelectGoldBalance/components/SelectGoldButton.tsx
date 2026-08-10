import { SwapType } from '@0xsequence/metadata'
import { ItemType } from '@opensky/proto'
import { memo, MouseEvent, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '~/shared/components/Button'
import {
  selectGoldsState,
  updateSelectGoldsState
} from '~/shared/state/select-golds/select-golds-state'

interface MarketCardButtonProps {
  id: number
  isSelected?: boolean
}

export const SelectGoldButton = memo(({ id, isSelected }: MarketCardButtonProps) => {
  const onClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault()
      const { selectedCards } = selectGoldsState

      const isSelected = selectedCards.some((card) => card.tokenId === id)

      if (isSelected) {
        updateSelectGoldsState(
          'selectedCards',
          selectedCards.filter((card) => card.tokenId !== id)
        )
      } else {
        updateSelectGoldsState('selectedCards', [
          ...selectedCards,
          {
            tokenId: id,
            amount: 1,
            type: ItemType.SW_GOLD_CARDS,
            side: SwapType.SELL
          }
        ])
      }
    },
    [id]
  )

  const { t } = useTranslation()

  return (
    <Button
      onClick={onClick}
      frameType="default"
      colorType={isSelected ? 'secondary' : 'blue'}
      checked={isSelected}
      text={`${isSelected ? t('generic.Deselect') : t('generic.Select')} ${t(
        'generic.Card'
      )}`}
    />
  )
})

SelectGoldButton.displayName = 'SelectGoldButton'
