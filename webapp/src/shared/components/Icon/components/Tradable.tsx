import { memo } from 'react'

import { IconSVG } from '../shared/components/IconSVG'
import { IconSVGProps } from '../shared/types/icon-svg-props'

export const Tradable = memo(({ color, height }: IconSVGProps) => (
  <IconSVG boxWidth={48} boxHeight={48} color={color} height={height}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M23.6203 3.3953L13.1023 11.3547L13.1477 30.7168L23.4629 38.7919L34.3816 30.8348L34.3361 11.4727L23.6203 3.3953ZM23.6636 10.3115L17.2454 15.1684L17.2731 26.9834L23.5676 31.911L30.2303 27.0555L30.2026 15.2405L23.6636 10.3115Z"
      fill="white"
    />
    <path
      opacity="0.5"
      d="M23.4839 14.4738L20.0906 17.4093L20.0832 24.5211L23.393 27.4755L26.9152 24.5404L26.9226 17.4285L23.4839 14.4738Z"
      fill="white"
    />
    <path
      d="M36.3333 29.6011L41.9211 14L48 30.1594L44 26C44.5833 39.9572 32.8333 43 27 43C37.2667 41.2135 40.1944 30.2802 40 26L36.3333 29.6011Z"
      fill="white"
    />
    <path
      d="M11.6667 13.3989L6.07895 29L1.4127e-06 12.8406L4 17C3.41667 3.04278 15.1667 -5.09966e-07 21 0C10.7333 1.78652 7.80556 12.7198 8 17L11.6667 13.3989Z"
      fill="white"
    />
  </IconSVG>
))

Tradable.displayName = 'Tradable'
