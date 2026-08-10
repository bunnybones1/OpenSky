import { usePress } from '@react-aria/interactions'
import clsx from 'clsx'
import {
  isValidElement,
  memo,
  MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import { usePopperTooltip } from 'react-popper-tooltip'

import { Text } from '~/shared/components/Text'
import { BASE_TOOLTIP_DELAY } from '~/shared/constants/ui'
import { getTooltipPaddingMod } from '~/shared/helpers/get-tooltip-padding-mod'
import { PressTooltipStyle } from '~/shared/style/PressTooltip.css'

import { TooltipStyle } from '../shared/Tooltip.css'
import { TooltipProps } from '../shared/types'

type PressTooltipProps = Omit<TooltipProps, 'showOnClick'>

export const PressTooltip = memo(
  ({
    children,
    tooltip,
    placement,
    offsetX,
    offsetY,
    tooltipDelay,
    tooltipPadding,
    className,
    tooltipClassName
  }: PressTooltipProps) => {
    const [isVisible, setIsVisible] = useState(false)
    const pressTimer = useRef<number | null>(null)

    const popperOptions = useMemo(() => {
      if (!!tooltipPadding)
        return {
          modifiers: [
            getTooltipPaddingMod(tooltipPadding),
            {
              name: 'offset',
              options: {
                offset: [offsetY || 0, offsetX || 6]
              }
            }
          ]
        }
      return
    }, [offsetX, offsetY, tooltipPadding])

    const { getTooltipProps, setTooltipRef, setTriggerRef, visible } =
      usePopperTooltip(
        {
          trigger: null,
          placement: placement || 'auto',
          offset: [offsetX || 0, offsetY || 6],
          visible: isVisible
        },
        {
          ...popperOptions,
          strategy: 'fixed'
        }
      )

    const { pressProps } = usePress({
      onPressChange(_isPressed) {
        if (_isPressed) {
          pressTimer.current = window.setTimeout(() => {
            setIsVisible(true)
          }, tooltipDelay || BASE_TOOLTIP_DELAY)
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

    useEffect(() => {
      if (tooltip === undefined) {
        setIsVisible(false)
      }
    }, [tooltip])

    const isComponent = useMemo(() => {
      return isValidElement(tooltip)
    }, [tooltip])

    return (
      <>
        {visible && !!tooltip && (
          <div
            className={clsx(TooltipStyle, tooltipClassName, {
              noPadding: isComponent
            })}
            ref={setTooltipRef}
            {...getTooltipProps()}
          >
            {isComponent ? (
              tooltip
            ) : (
              <Text color="white" fontSize="14px">
                {tooltip}
              </Text>
            )}
          </div>
        )}
        <div
          onContextMenu={onContextMenu}
          ref={setTriggerRef}
          {...pressProps}
          className={clsx(PressTooltipStyle, className)}
        >
          {children}
        </div>
      </>
    )
  }
)

PressTooltip.displayName = 'PressTooltip'
