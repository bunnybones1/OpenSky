import { ItemType } from '@opensky/proto'
import clsx from 'clsx'
import { memo, useCallback, useMemo } from 'react'

import { Button } from '~/shared/components/Button'
import { Icon } from '~/shared/components/Icon/Icon'
import { Text } from '~/shared/components/Text'
import { useBalancesForCard } from '~/shared/hooks/cards/useBalancesForCard'
import {
  selectSilversState,
  updateSelectSilversState
} from '~/shared/state/select-silvers/select-silvers-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { PickerTextStyle } from './BurnSilverQuantityPicker.css'

interface CardQuantityPickerProps {
  amount: number
  id: number
  type: ItemType.SW_GOLD_CARDS | ItemType.SW_SILVER_CARDS
}

export const BurnSilverQuantityPicker = memo(
  ({ id, type, amount }: CardQuantityPickerProps) => {
    const cardBalances = useBalancesForCard(id)

    const balance = useMemo(() => {
      if (!cardBalances) return cardBalances
      const _balance = cardBalances.find(({ itemType }) => itemType === type)?.balance

      if (!_balance) return null

      return _balance
    }, [cardBalances, type])

    const increaseAmount = useCallback(() => {
      const newSelection = selectSilversState.selectedCards.map((card) => {
        if (card.id === id) {
          return {
            ...card,
            quantity: card.quantity + 1
          }
        }
        return card
      })

      updateSelectSilversState('selectedCards', newSelection)
    }, [id])

    const decreaseAmount = useCallback(() => {
      const newSelection = selectSilversState.selectedCards
        .map((card) => {
          if (card.id === id) {
            return {
              ...card,
              quantity: card.quantity - 1
            }
          }
          return card
        })
        .filter((card) => card.quantity > 0)

      updateSelectSilversState('selectedCards', newSelection)
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

BurnSilverQuantityPicker.displayName = 'BurnSilverQuantityPicker'
