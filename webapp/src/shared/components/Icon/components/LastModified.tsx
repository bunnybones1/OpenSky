import { memo } from 'react'

import { IconSVG } from '../shared/components/IconSVG'
import { IconSVGProps } from '../shared/types/icon-svg-props'

export const LastModified = memo(({ color, height }: IconSVGProps) => (
  <IconSVG boxWidth={48} boxHeight={48} color={color} height={height}>
    <path d="M15.0057 34.2895H11.7236V1.71448C11.7236 0.771515 10.9521 0 10.0091 0H6.58016C5.63719 0 4.86568 0.771515 4.86568 1.71448V34.2895H1.71656C0.194958 34.2895 -0.576557 36.1326 0.505707 37.2149L7.08378 47.5017C7.74814 48.1661 8.84112 48.1661 9.50548 47.5017L16.2165 37.2149C17.2881 36.1433 16.5273 34.2895 15.0057 34.2895Z" />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M33 0C25.2679 0 19 6.26794 19 14C19 21.7317 25.2679 28 33 28C40.7317 28 47 21.7317 47 14C47 6.26794 40.7317 0 33 0ZM36.6793 5H32V17H42V12.438H36.6793V5Z"
    />
  </IconSVG>
))

LastModified.displayName = 'LastModified'
