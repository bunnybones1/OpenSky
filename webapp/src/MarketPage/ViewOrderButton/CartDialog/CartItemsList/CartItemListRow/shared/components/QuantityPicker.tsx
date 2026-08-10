import clsx from 'clsx'
import { memo } from 'react'

import { Button } from '~/shared/components/Button'
import { Text } from '~/shared/components/Text'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { QuantityPickerTextStyle } from './QuantityPicker.css'

interface QuantityPickerProps {
  amount: number
  max: number
  decreaseAmount: () => void
  increaseAmount: () => void
}

export const QuantityPicker = memo(
  ({ decreaseAmount, increaseAmount, amount, max }: QuantityPickerProps) => {
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
            QuantityPickerTextStyle
          )}
        >
          {`${amount} / ${max}`}
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
          disabled={amount === max}
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

QuantityPicker.displayName = 'QuantityPicker'
