import { usePress } from '@react-aria/interactions'
import clsx from 'clsx'
import { memo, MouseEvent, useCallback, useRef, useState } from 'react'
import { usePopperTooltip } from 'react-popper-tooltip'

import { BASE_TOOLTIP_DELAY } from '~/shared/constants/ui'
import { PressTooltipStyle } from '~/shared/style/PressTooltip.css'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { CardImage } from '../../CardImage/CardImage'
import { CardImageTooltipWrapper } from '../shared/CardRowTooltip.css'
import { CardRowTooltipProps } from '../shared/types'

export const PressCardRowTooltip = memo(
  ({ children, id, disabled }: CardRowTooltipProps) => {
    const [isVisible, setIsVisible] = useState(false)
    const pressTimer = useRef<number | null>(null)

    const { getTooltipProps, setTooltipRef, setTriggerRef, visible } =
      usePopperTooltip(
        {
          trigger: null,
          placement: 'left',
          visible: isVisible
        },
        {
          strategy: 'fixed'
        }
      )

    const { pressProps } = usePress({
      onPressChange(_isPressed) {
        if (_isPressed) {
          pressTimer.current = window.setTimeout(() => {
            setIsVisible(true)
          }, BASE_TOOLTIP_DELAY)
        } else {
          setIsVisible(false)
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
      <>
        {visible && !disabled && (
          <div
            className={CardImageTooltipWrapper}
            ref={setTooltipRef}
            {...getTooltipProps()}
          >
            <CardImage id={id} />
          </div>
        )}
        <div
          ref={setTriggerRef}
          onContextMenu={onContextMenu}
          {...pressProps}
          className={clsx(
            PressTooltipStyle,
            Sprinkles({
              pointerEvents: disabled ? 'none' : 'all'
            })
          )}
        >
          {children}
        </div>
      </>
    )
  }
)

PressCardRowTooltip.displayName = 'PressCardRowTooltip'
