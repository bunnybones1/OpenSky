import { memo } from 'react'
import { usePopperTooltip } from 'react-popper-tooltip'

import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { CardImage } from '../../CardImage/CardImage'
import { CardImageTooltipWrapper } from '../shared/CardRowTooltip.css'
import { CardRowTooltipProps } from '../shared/types'

export const HoverCardRowTooltip = memo(
  ({ id, children, disabled }: CardRowTooltipProps) => {
    const { getTooltipProps, setTooltipRef, setTriggerRef, visible } =
      usePopperTooltip(
        {
          trigger: 'hover',
          placement: 'left'
        },
        {
          strategy: 'fixed'
        }
      )
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
          className={Sprinkles({
            pointerEvents: disabled ? 'none' : 'all',
            width: 'full',
            display: 'flex'
          })}
        >
          {children}
        </div>
      </>
    )
  }
)

HoverCardRowTooltip.displayName = 'HoverCardRowTooltip'
