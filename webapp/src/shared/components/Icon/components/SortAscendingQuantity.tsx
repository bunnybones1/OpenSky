import { memo } from 'react'

import { IconSVG } from '../shared/components/IconSVG'
import { IconSVGProps } from '../shared/types/icon-svg-props'

export const SortAscendingQuantity = memo(({ color, height }: IconSVGProps) => (
  <IconSVG boxWidth={48} boxHeight={48} color={color} height={height}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M34 30.6512L40.433 26L47.1133 30.6512V41.3488L40.433 46L34 41.3488V30.6512Z"
      fill="white"
    />
    <path
      d="M31.192 26L26.2262 32.2966L29.1915 43.0374L36.0168 45.7906L31 42.1867V29.6106L34.1162 27.1196L31.192 26Z"
      fill="white"
    />
    <path
      d="M21.678 28.3792L19 35.8705L25.2896 45.1648L32.6604 45.6992L26.7315 43.806L22.6637 31.8658L24.8166 28.5512L21.678 28.3792Z"
      fill="white"
    />
    <path
      d="M14.2892 34.2895H11.7236V1.71448C11.7236 0.771515 10.9521 0 10.0091 0H6.58015C5.63719 0 4.86567 0.771515 4.86567 1.71448V34.2895H1.71655C0.194949 34.2895 -0.576566 36.1326 0.505698 37.2149L7.08378 47.5017C7.74813 48.1661 8.84111 48.1661 9.50547 47.5017L15.5 37.2149C16.5715 36.1433 15.8107 34.2895 14.2892 34.2895Z"
      fill="white"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M26 5.11628L32.8679 0L40 5.11628V16.8837L32.8679 22L26 16.8837V5.11628Z"
      fill="white"
    />
  </IconSVG>
))

SortAscendingQuantity.displayName = 'SortAscendingQuantity'
