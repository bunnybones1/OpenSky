import clsx from 'clsx'
import { isValidElement, memo, useMemo } from 'react'
import { usePopperTooltip } from 'react-popper-tooltip'

import { Text } from '~/shared/components/Text'
import { BASE_TOOLTIP_DELAY } from '~/shared/constants/ui'
import { getTooltipPaddingMod } from '~/shared/helpers/get-tooltip-padding-mod'

import { TooltipStyle } from '../shared/Tooltip.css'
import { TooltipProps } from '../shared/types'

type HoverTooltipProps = Omit<TooltipProps, 'showOnClick'>

export const HoverTooltip = memo(
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
  }: HoverTooltipProps) => {
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
          trigger: 'hover',
          placement: placement || 'auto',
          delayShow: tooltipDelay || BASE_TOOLTIP_DELAY,
          offset: [offsetX || 0, offsetY || 6]
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
        <div className={className} ref={setTriggerRef}>
          {children}
        </div>
      </>
    )
  }
)

HoverTooltip.displayName = 'HoverTooltip'
