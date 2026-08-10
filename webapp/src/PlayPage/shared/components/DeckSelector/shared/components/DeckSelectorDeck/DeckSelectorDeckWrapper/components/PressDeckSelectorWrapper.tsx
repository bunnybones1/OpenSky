import { usePress } from '@react-aria/interactions'
import { memo, MouseEvent, ReactNode, useCallback, useRef, useState } from 'react'

import { Tooltip } from '~/shared/components/Tooltip/Tooltip'
import { BASE_TOOLTIP_DELAY } from '~/shared/constants/ui'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import DeckDetailsTooltip from '../shared/components/DeckDetailsTooltip/DeckDetailsTooltip'

interface PressDeckSelectorWrapperProps {
  uuid: string
  children: ReactNode
}

export const PressDeckSelectorWrapper = memo(
  ({ uuid, children }: PressDeckSelectorWrapperProps) => {
    const [isTooltipVisible, setIsTooltipVisible] = useState(false)
    const pressTimer = useRef<number | null>(null)

    const { pressProps } = usePress({
      onPressChange(_isPressed) {
        if (_isPressed) {
          pressTimer.current = window.setTimeout(() => {
            setIsTooltipVisible(true)
          }, BASE_TOOLTIP_DELAY)
        } else {
          setIsTooltipVisible(false)
          if (pressTimer.current) {
            window.clearTimeout(pressTimer.current)
          }
        }
      }
    })

    const onContextMenu = useCallback((event: MouseEvent) => {
      event.preventDefault()
    }, [])

    return (
      <Tooltip
        placement="right"
        tooltip={<DeckDetailsTooltip uuid={uuid} />}
        className={Sprinkles({ width: 'full' })}
        offsetY={-8}
        isVisible={isTooltipVisible}
      >
        <div
          className={Sprinkles({
            width: 'full',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            position: 'relative'
          })}
          onContextMenu={onContextMenu}
          {...pressProps}
        >
          {children}
        </div>
      </Tooltip>
    )
  }
)

PressDeckSelectorWrapper.displayName = 'PressDeckSelectorWrapper'
