import clsx from 'clsx'
import { memo, useLayoutEffect, useRef } from 'react'

import { Sprinkles } from '~/shared/style/Sprinkles.css'
import { ThemeColorType } from '~/shared/style/Theme'

import {
  BarStyle,
  DeckStatsRatioBarStyle,
  LeftBarStyle
} from './DeckStatsRatioBar.css'

interface DeckStatsRatioBarProps {
  leftBarColor: ThemeColorType
  rightBarColor?: ThemeColorType
  rightBarValue?: number
  leftBarValue: number
}

export const DeckStatsRatioBar = memo(
  ({
    rightBarColor,
    leftBarValue,
    rightBarValue,
    leftBarColor
  }: DeckStatsRatioBarProps) => {
    const leftBarRef = useRef<HTMLDivElement | null>(null)

    useLayoutEffect(() => {
      if (leftBarRef.current) {
        const leftBarRatio = leftBarValue / (leftBarValue + (rightBarValue || 0))
        leftBarRef.current.style.width = `${
          leftBarRatio >= 1 ? 100 : 100 * leftBarRatio
        }%`
      }
    }, [leftBarValue, rightBarValue])

    return (
      <div
        className={clsx(
          Sprinkles({
            width: 'full',
            position: 'relative'
          }),
          DeckStatsRatioBarStyle
        )}
      >
        <div
          className={clsx(
            LeftBarStyle,
            BarStyle,
            Sprinkles({
              height: 'full',
              backgroundColor: leftBarColor,
              position: 'absolute',
              left: 0,
              top: 0
            })
          )}
          ref={leftBarRef}
        />
        <div
          className={clsx(
            Sprinkles({
              height: 'full',
              backgroundColor: rightBarColor || 'transparent',
              width: 'full'
            }),
            BarStyle
          )}
        />
      </div>
    )
  }
)

DeckStatsRatioBar.displayName = 'DeckStatsRatioBar'
