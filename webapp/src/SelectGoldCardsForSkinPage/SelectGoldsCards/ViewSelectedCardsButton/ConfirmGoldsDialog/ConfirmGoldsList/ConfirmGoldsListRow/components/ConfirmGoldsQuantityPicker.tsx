import { ItemType } from '@opensky/proto'
import clsx from 'clsx'
import { memo, useCallback, useMemo } from 'react'

import { Button } from '~/shared/components/Button'
import { Icon } from '~/shared/components/Icon/Icon'
import { Text } from '~/shared/components/Text'
import { useBalancesForCard } from '~/shared/hooks/cards/useBalancesForCard'
import {
  selectGoldsState,
  updateSelectGoldsState
} from '~/shared/state/select-golds/select-golds-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { PickerTextStyle } from './ConfirmGoldsQuantityPicker.css'

interface CardQuantityPickerProps {
  amount: number
  id: number
}

export const ConfirmGoldsQuantityPicker = memo(
  ({ id, amount }: CardQuantityPickerProps) => {
    const cardBalances = useBalancesForCard(id)

    const balance = useMemo(() => {
      if (!cardBalances) return cardBalances
      const _balance = cardBalances.find(
        ({ itemType }) => itemType === ItemType.SW_GOLD_CARDS
      )?.balance

      if (!_balance) return null

      return _balance
    }, [cardBalances])

    const increaseAmount = useCallback(() => {
      const newSelection = selectGoldsState.selectedCards.map((card) => {
        if (card.tokenId === id) {
          return {
            ...card,
            quantity: card.amount + 1
          }
        }
        return card
      })

      updateSelectGoldsState('selectedCards', newSelection)
    }, [id])

    const decreaseAmount = useCallback(() => {
      const newSelection = selectGoldsState.selectedCards
        .map((card) => {
          if (card.tokenId === id) {
            return {
              ...card,
              quantity: card.amount - 1
            }
          }
          return card
        })
        .filter((card) => card.amount > 0)

      updateSelectGoldsState('selectedCards', newSelection)
    }, [id])

    if (balance === undefined) {
      return <Icon type="spinner" height="16px" color="white" />
    }

    if (balance === null) return null

    return (
      <div
        className={Sprinkles({
          width: 'full',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start'
        })}
      >
        <Text
          color="white"
          fontSize="16px"
          className={clsx(
            Sprinkles({
              display: 'flex',
              justifyContent: 'flex-start',
              marginRight: '4px'
            }),
            PickerTextStyle
          )}
        >
          {`${amount} / ${balance}`}
        </Text>

        <Button
          disabled={amount === 1}
          leftAdornment={{ icon: 'caret-down' }}
          frameType="roundedLeft"
          colorType="default"
          height="28px"
          onClick={decreaseAmount}
        />
        <Button
          disabled={amount === balance}
          height="28px"
          leftAdornment={{ icon: 'caret-up' }}
          frameType="roundedRight"
          colorType="default"
          onClick={increaseAmount}
        />
      </div>
    )
  }
)

ConfirmGoldsQuantityPicker.displayName = 'ConfirmGoldsQuantityPicker'
