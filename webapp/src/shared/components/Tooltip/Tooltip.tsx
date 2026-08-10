import { memo } from 'react'

import { useMediaQuery } from '~/shared/hooks/ui/useMediaQuery'

import { ControlTooltip } from './components/ControlTooltip'
import { HoverTooltip } from './components/HoverTooltip'
import { PressTooltip } from './components/PressTooltip'
import { TooltipProps } from './shared/types'

export const Tooltip = memo(({ showOnClick, isVisible, ...props }: TooltipProps) => {
  const isTouchDevice = useMediaQuery('(any-hover: none)')

  if (isVisible !== undefined) {
    return <ControlTooltip isVisible={isVisible} {...props} />
  }

  if (showOnClick || isTouchDevice) {
    return <PressTooltip {...props} />
  }
  return <HoverTooltip {...props} />
})

Tooltip.displayName = 'Tooltip'
