import clsx from 'clsx'
import { AllHTMLAttributes } from 'react'

import { IconSprinklesParams } from '~/shared/style/IconSprinkles.css'
import { SprinklesParams } from '~/shared/style/Sprinkles.css'

export interface SharedIconProps
  extends Omit<
      AllHTMLAttributes<HTMLElement>,
      | 'className'
      | 'content'
      | 'height'
      | 'translate'
      | 'color'
      | 'width'
      | 'cursor'
      | 'size'
      | 'onClick'
      | 'type'
      | 'crossOrigin'
    >,
    IconSprinklesParams,
    Partial<
      Pick<
        SprinklesParams,
        | 'paddingTop'
        | 'paddingBottom'
        | 'paddingLeft'
        | 'paddingRight'
        | 'marginTop'
        | 'marginBottom'
        | 'marginLeft'
        | 'marginRight'
        | 'position'
        | 'pointerEvents'
        | 'cursor'
        | 'padding'
        | 'paddingX'
        | 'paddingY'
        | 'margin'
        | 'marginX'
        | 'marginY'
      >
    > {
  className?: Parameters<typeof clsx>[0]
  onClick?: () => void
  height: IconSprinklesParams['height']
}
