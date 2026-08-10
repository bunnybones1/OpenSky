import { memo } from 'react'

import { IconSVG } from '../shared/components/IconSVG'
import { IconSVGProps } from '../shared/types/icon-svg-props'

export const ArrowUp = memo(({ color, height }: IconSVGProps) => (
  <IconSVG boxWidth={48} boxHeight={49} color={color} height={height}>
    <path d="M19.5107 15.3678V47.7143C19.5107 48.4214 20.0893 49 20.7964 49H26.7964C27.5036 49 28.0821 48.4214 28.0821 47.7143V15.3678H33.0214C35.3143 15.3678 36.4607 12.5928 34.8428 10.975L25.6178 1.74999C24.6107 0.742843 22.9821 0.742843 21.9857 1.74999L12.7607 10.975C11.1428 12.5928 12.2893 15.3678 14.5821 15.3678H19.5107Z" />
  </IconSVG>
))

ArrowUp.displayName = 'ArrowUp'
