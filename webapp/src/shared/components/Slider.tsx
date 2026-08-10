import clsx from 'clsx'
import debounce from 'lodash-es/debounce'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { SpriteKeys } from '~/clients/SoundClient/types'
import { Button } from '~/shared/components/Button'
import { Text } from '~/shared/components/Text'
import { Sprinkles } from '~/shared/style/Sprinkles.css'
import { ThemeVars } from '~/shared/style/Theme.css'

import { SliderLabel, SliderLeftLabel, SliderRange } from './Slider.css'

export interface SliderProps {
  value: number
  leftLabel?: string
  showValue?: boolean
  onChange?: (value: number) => void
  isDisabled?: boolean
  onCallback?: (value: number) => void
  clickSound?: SpriteKeys | null
}

const FontSize = { base: '14px', tabletWide: '18px' } as const

type Direction = 'increment' | 'decrement'

export const Slider = memo(
  ({
    value,
    leftLabel,
    showValue = true,
    isDisabled,
    onChange,
    onCallback,
    clickSound = 'CursorMainClick'
  }: SliderProps) => {
    const inputRef = useRef<HTMLInputElement>(null)
    const [sliderValue, setSliderValue] = useState<number>(value)
    const incrementInterval = useRef<NodeJS.Timeout | null>(null)
    const [isSliding, setIsSliding] = useState<boolean>(false)

    const handleEndSliding = () => {
      if (isSliding) {
        if (onCallback) onCallback(sliderValue)
        setIsSliding(false)
      }
    }

    const updateValue = useCallback(
      (value: number) => {
        if (onChange) onChange(value)
      },
      [onChange]
    )

    const debouncedCallBack = useMemo(() => debounce(updateValue, 700), [updateValue])

    const handleChangeSliderColor = useCallback((passedValue: number) => {
      const element = inputRef.current
      if (element) {
        const inputValue = passedValue > 100 ? 100 : passedValue
        const value =
          ((inputValue - Number(element.min)) /
            (Number(element.max) - Number(element.min))) *
          100
        element.style.background = `linear-gradient(to right, ${ThemeVars.color.purple9} 0%, ${ThemeVars.color.purple9} ${value}%, ${ThemeVars.color.purple6} ${value}%, ${ThemeVars.color.purple6} 100%)`
      }
    }, [])

    const handleMouseUp = useCallback(() => {
      if (incrementInterval.current !== null) {
        clearInterval(incrementInterval.current)
      }
    }, [])

    const updateSliderValue = useCallback(
      (direction: Direction) => {
        setSliderValue((prevValue) => {
          if (
            (prevValue === 100 && direction === 'increment') ||
            (prevValue === 0 && direction === 'decrement')
          ) {
            return prevValue
          }
          const newValue = direction === 'increment' ? prevValue + 1 : prevValue - 1
          handleChangeSliderColor(newValue)
          debouncedCallBack(newValue)
          return newValue
        })
      },
      [debouncedCallBack, handleChangeSliderColor]
    )

    const handleMouseDown = useCallback(
      (direction: Direction) => {
        incrementInterval.current = setInterval(
          () => updateSliderValue(direction),
          100
        )
      },
      [updateSliderValue]
    )

    const handleChange = useCallback(
      (value: number) => {
        setSliderValue(value)
        handleChangeSliderColor(value)
        debouncedCallBack(value)
        if (onCallback && !isSliding) onCallback(value)
      },
      [debouncedCallBack, handleChangeSliderColor, onCallback, isSliding]
    )

    useEffect(() => {
      setSliderValue(value)
      handleChangeSliderColor(value)
    }, [value, handleChangeSliderColor])

    return (
      <>
        {leftLabel && (
          <Text
            fontSize={FontSize}
            color="white"
            fontWeight={'600'}
            className={SliderLeftLabel}
          >
            {leftLabel}
          </Text>
        )}
        <div
          className={Sprinkles({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          })}
        >
          <Button
            frameType="default"
            colorType="default"
            height="28px"
            clickSound={clickSound}
            leftAdornment={{ icon: 'minimize' }}
            disabled={Number(sliderValue) == 0 || isDisabled}
            onClick={() => handleChange(Number(sliderValue) - 1)}
            onMouseDown={() => handleMouseDown('decrement')}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={() => handleMouseDown('decrement')}
            onTouchEnd={handleMouseUp}
          />
          <input
            ref={inputRef}
            type="range"
            min="0"
            max="100"
            disabled={isDisabled}
            value={sliderValue}
            onChange={(event) => handleChange(Number(event.target.value))}
            className={clsx(Sprinkles({ marginX: '12px' }), SliderRange)}
            onMouseDown={() => setIsSliding(true)}
            onTouchStart={() => setIsSliding(true)}
            onMouseUp={handleEndSliding}
            onTouchEnd={handleEndSliding}
            onBlur={handleEndSliding}
          />
          <Button
            frameType="default"
            colorType="default"
            height="28px"
            clickSound={clickSound}
            leftAdornment={{ icon: 'plus' }}
            disabled={Number(sliderValue) == 100 || isDisabled}
            onClick={() => handleChange(Number(sliderValue) + 1)}
            onMouseDown={() => handleMouseDown('increment')}
            onMouseUp={handleMouseUp}
            onTouchStart={() => handleMouseDown('increment')}
            onTouchEnd={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </div>
        {showValue && (
          <Text
            fontSize={FontSize}
            color="white"
            fontWeight={'600'}
            className={SliderLabel}
            marginLeft="12px"
          >
            {sliderValue > 100 ? 100 : sliderValue}%
          </Text>
        )}
      </>
    )
  }
)

Slider.displayName = 'Slider'
