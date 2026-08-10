import { TooltipPadding } from '../types/tooltip'

export const getTooltipPaddingMod = (padding: TooltipPadding) => {
  return {
    name: 'flip',
    options: {
      padding: padding,
      rootBoundary: 'viewport'
    }
  } as const
}
