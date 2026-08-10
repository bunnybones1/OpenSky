import { Placement } from '@popperjs/core'
import { ReactNode } from 'react'

import { TooltipPadding } from '~/shared/types/tooltip'

export interface TooltipProps {
  children: ReactNode | string
  tooltip: ReactNode
  showOnClick?: boolean
  placement?: Placement
  isVisible?: boolean
  offsetY?: number
  offsetX?: number
  tooltipDelay?: number
  tooltipPadding?: TooltipPadding
  className?: string
  tooltipClassName?: string
}
