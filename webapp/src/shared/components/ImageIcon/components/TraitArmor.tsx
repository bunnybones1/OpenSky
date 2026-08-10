import { memo } from 'react'

import { ImageIconSVG } from '../shared/components/ImageIconSVG'
import { ImageIconSVGProps } from '../shared/types/image-icon-svg-props'

export const TraitArmor = memo(({ height }: ImageIconSVGProps) => (
  <ImageIconSVG boxWidth={48} boxHeight={48} height={height}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M42.5042 32.2857C44.7227 29.8655 48 24.8739 48 19.7311C48 11.0588 41.7983 4 34.1849 4C30.1513 4 26.6218 7.57983 24.1008 10.7563C21.5798 7.57983 17.8487 4 13.8151 4C6.20168 4 0 11.0588 0 19.7311C0 24.8739 3.27731 29.8655 5.4958 32.2857C8.03537 35.1276 14.1825 40.5981 18.6977 44.5231V32.0312H11.0769L24.0309 18.7692L37.0969 32.0312H29.476V44.372C33.9739 40.4588 39.9971 35.0913 42.5042 32.2857Z"
      fill="#70C1F8"
    />
  </ImageIconSVG>
))

TraitArmor.displayName = 'TraitArmor'
