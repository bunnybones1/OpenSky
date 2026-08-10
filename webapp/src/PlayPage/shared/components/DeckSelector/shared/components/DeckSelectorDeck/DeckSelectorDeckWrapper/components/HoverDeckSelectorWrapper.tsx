import { memo, ReactNode, useCallback, useEffect, useRef, useState } from 'react'

import { Tooltip } from '~/shared/components/Tooltip/Tooltip'
import { BASE_TOOLTIP_DELAY } from '~/shared/constants/ui'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import DeckDetailsTooltip from '../shared/components/DeckDetailsTooltip/DeckDetailsTooltip'

interface HoverDeckSelectorWrapperProps {
  uuid: string
  children: ReactNode
}

export const HoverDeckSelectorWrapper = memo(
  ({ uuid, children }: HoverDeckSelectorWrapperProps) => {
    const [isTooltipVisible, setIsTooltipVisible] = useState(false)
    const timerRef = useRef<number | null>(null)
    const isHoveringTooltipRef = useRef(false)

    useEffect(() => {
      return () => {
        if (!!timerRef.current) {
          window.clearTimeout(timerRef.current)
        }
      }
    }, [])

    const showToolTip = useCallback(() => {
      if (!!timerRef.current) window.clearTimeout(timerRef.current)

      timerRef.current = window.setTimeout(() => {
        setIsTooltipVisible(true)
      }, BASE_TOOLTIP_DELAY)
    }, [])

    const hideToolTip = useCallback(() => {
      isHoveringTooltipRef.current = false
      setIsTooltipVisible(false)
    }, [])

    const onMouseLeave = useCallback(() => {
      if (timerRef.current) window.clearTimeout(timerRef.current)

      timerRef.current = window.setTimeout(() => {
        if (!isHoveringTooltipRef.current) {
          setIsTooltipVisible(false)
        }
      }, 50)
    }, [])

    const onTooltipHover = useCallback(() => {
      if (timerRef.current) window.clearTimeout(timerRef.current)

      isHoveringTooltipRef.current = true
    }, [])

    return (
      <Tooltip
        placement="right"
        tooltip={
          <DeckDetailsTooltip
            onMouseEnter={onTooltipHover}
            onMouseLeave={hideToolTip}
            uuid={uuid}
          />
        }
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
          onMouseEnter={showToolTip}
          onMouseLeave={onMouseLeave}
        >
          {children}
        </div>
      </Tooltip>
    )
  }
)

HoverDeckSelectorWrapper.displayName = 'HoverDeckSelectorWrapper'
