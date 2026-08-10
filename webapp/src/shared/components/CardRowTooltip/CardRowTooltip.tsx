import { isValidElement, memo, useMemo } from 'react'

import { Cards } from '~/shared/constants/cards'
import { useMediaQuery } from '~/shared/hooks/ui/useMediaQuery'

import { HoverCardRowTooltip } from './components/HoverCardRowTooltip'
import { PressCardRowTooltip } from './components/PressCardRowTooltip'
import { CardRowTooltipProps } from './shared/types'

export const CardRowTooltip = memo(
  ({ id, children, disabled }: CardRowTooltipProps) => {
    const isTouchDevice = useMediaQuery('(any-hover: none)')

    const card = useMemo(() => {
      return Cards.get(id)
    }, [id])

    if (!card || !isValidElement(children)) return <>{children}</>

    if (isTouchDevice) {
      return (
        <PressCardRowTooltip disabled={disabled} id={id}>
          {children}
        </PressCardRowTooltip>
      )
    }

    return (
      <HoverCardRowTooltip disabled={disabled} id={id}>
        {children}
      </HoverCardRowTooltip>
    )
  }
)

CardRowTooltip.displayName = 'CardRowTooltip'
