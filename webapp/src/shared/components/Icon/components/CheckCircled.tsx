import { memo } from 'react'

import { IconSVG } from '../shared/components/IconSVG'
import { IconSVGProps } from '../shared/types/icon-svg-props'
import { CheckCircledBrightPathStyle } from './CheckCircled.css'

export const CheckCircled = memo(({ color, height }: IconSVGProps) => {
  return (
    <IconSVG boxWidth={48} boxHeight={48} color={color} height={height}>
      <defs>
        <filter id="CheckCircledStrokeBrightness">
          <feComponentTransfer>
            <feFuncR type="linear" slope="3.5"></feFuncR>
            <feFuncG type="linear" slope="3.5"></feFuncG>
            <feFuncB type="linear" slope="3.5"></feFuncB>
          </feComponentTransfer>
        </filter>
      </defs>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M24 46.8572C36.6237 46.8572 46.8572 36.6237 46.8572 24C46.8572 11.3764 36.6237 1.14288 24 1.14288C11.3764 1.14288 1.14288 11.3764 1.14288 24C1.14288 36.6237 11.3764 46.8572 24 46.8572Z"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        className={CheckCircledBrightPathStyle}
        d="M0 24C0 10.7452 10.7452 0 24 0C37.2548 0 48 10.7452 48 24C48 37.2548 37.2548 48 24 48C10.7452 48 0 37.2548 0 24ZM24 2.28571C12.0075 2.28571 2.28571 12.0075 2.28571 24C2.28571 35.9925 12.0075 45.7143 24 45.7143C35.9925 45.7143 45.7143 35.9925 45.7143 24C45.7143 12.0075 35.9925 2.28571 24 2.28571Z"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M35.8726 12.5714L20.7615 28.7899L11.407 21.1981L7.80914 25.6843L21.1213 36.381L40.1901 16.3675L35.8726 12.5714Z"
        fill="white"
      />
    </IconSVG>
  )
})

CheckCircled.displayName = 'CheckCircled'
