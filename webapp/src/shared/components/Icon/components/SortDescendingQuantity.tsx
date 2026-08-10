import { memo } from 'react'

import { IconSVG } from '../shared/components/IconSVG'
import { IconSVGProps } from '../shared/types/icon-svg-props'

export const SortDescendingQuantity = memo(({ color, height }: IconSVGProps) => (
  <IconSVG boxWidth={48} boxHeight={48} color={color} height={height}>
    <path
      d="M15.0057 34.2895H11.7236V1.71448C11.7236 0.771515 10.9521 0 10.0091 0H6.58016C5.63719 0 4.86568 0.771515 4.86568 1.71448V34.2895H1.71656C0.194958 34.2895 -0.576557 36.1326 0.505707 37.2149L7.08378 47.5017C7.74814 48.1661 8.84112 48.1661 9.50548 47.5017L16.2165 37.2149C17.2881 36.1433 16.5273 34.2895 15.0057 34.2895Z"
      fill="white"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M34 5.65116L40.433 1L47.1133 5.65116V16.3488L40.433 21L34 16.3488V5.65116Z"
      fill="white"
    />
    <path
      d="M31.192 1L26.2262 7.2966L29.1915 18.0374L36.0168 20.7906L31 17.1867V4.61062L34.1162 2.11962L31.192 1Z"
      fill="white"
    />
    <path
      d="M21.678 3.37919L19 10.8705L25.2896 20.1648L32.6604 20.6992L26.7315 18.806L22.6637 6.86576L24.8166 3.55122L21.678 3.37919Z"
      fill="white"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M26 31.1163L32.8679 26L40 31.1163V42.8837L32.8679 48L26 42.8837V31.1163Z"
      fill="white"
    />
  </IconSVG>
))

SortDescendingQuantity.displayName = 'SortDescendingQuantity'
