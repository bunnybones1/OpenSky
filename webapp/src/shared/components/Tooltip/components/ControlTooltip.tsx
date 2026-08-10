import clsx from 'clsx'
import { isValidElement, memo, useMemo } from 'react'
import { usePopperTooltip } from 'react-popper-tooltip'

import { Text } from '~/shared/components/Text'
import { getTooltipPaddingMod } from '~/shared/helpers/get-tooltip-padding-mod'

import { TooltipStyle } from '../shared/Tooltip.css'
import { TooltipProps } from '../shared/types'

type ControlTooltipProps = Omit<TooltipProps, 'showOnClick'> & { isVisible: boolean }

export const ControlTooltip = memo(
  ({
    children,
    tooltip,
    placement,
    offsetX,
    offsetY,
    tooltipDelay,
    isVisible,
    tooltipPadding,
    tooltipClassName,
    className
  }: ControlTooltipProps) => {
    const popperOptions = useMemo(() => {
      if (!!tooltipPadding) {
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
      }

      return
    }, [offsetX, offsetY, tooltipPadding])

    const { getTooltipProps, setTooltipRef, setTriggerRef, visible } =
      usePopperTooltip(
        {
          trigger: null,
          placement: placement || 'auto',
          offset: [offsetX || 0, offsetY || 6],
          visible: isVisible,
          delayShow: tooltipDelay
        },
        {
          ...popperOptions,
          strategy: 'fixed'
        }
      )

    const isComponent = useMemo(() => {
      return isValidElement(tooltip)
    }, [tooltip])

    return (
      <>
        {visible && (
          <div
            className={clsx(TooltipStyle, tooltipClassName, {
              noPadding: isComponent
            })}
            ref={setTooltipRef}
            {...getTooltipProps()}
          >
            {isValidElement(tooltip) ? (
              tooltip
            ) : (
              <Text color="white" fontSize="14px">
                {tooltip}
              </Text>
            )}
          </div>
        )}
        <div className={className} ref={setTriggerRef}>
          {children}
        </div>
      </>
    )
  }
)

ControlTooltip.displayName = 'ControlTooltip'
