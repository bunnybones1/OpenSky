import { memo, MouseEvent, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '~/shared/components/Button'
import {
  selectSilversState,
  updateSelectSilversState
} from '~/shared/state/select-silvers/select-silvers-state'

interface MarketCardButtonProps {
  id: number
  isSelected?: boolean
}

export const SelectSilverButton = memo(
  ({ id, isSelected }: MarketCardButtonProps) => {
    const onClick = useCallback(
      (event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault()
        const { selectedCards } = selectSilversState

        const isSelected = selectedCards.some((card) => card.id === id)

        if (isSelected) {
          updateSelectSilversState(
            'selectedCards',
            selectedCards.filter((card) => card.id !== id)
          )
        } else {
          updateSelectSilversState('selectedCards', [
            ...selectedCards,
            { id, quantity: 1 }
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
  }
)

SelectSilverButton.displayName = 'SelectSilverButton'
