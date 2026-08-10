import { memo } from 'react'

import { ImageIconSVG } from '../shared/components/ImageIconSVG'
import { ImageIconSVGProps } from '../shared/types/image-icon-svg-props'

export const TraitBanner = memo(({ height }: ImageIconSVGProps) => (
  <ImageIconSVG boxWidth={48} boxHeight={48} height={height}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M6.67698 22.6103C7.15938 25.0811 9.05177 27.0347 11.5046 27.5951L14.5249 28.2863C16.6405 28.7711 18.2449 30.4979 18.5725 32.6435C18.9025 34.7974 20.5201 36.5302 22.6489 37.0054L43.0152 41.5594C43.0152 41.5594 40.5012 35.0434 41.6172 29.8715C42.8952 23.9591 47.8344 19.2899 48 19.2683L27.8461 14.7623C25.7257 14.2871 24.1141 12.5627 23.7865 10.416C23.4565 8.26556 21.8413 6.53877 19.7185 6.06717L8.11458 3.48838L8.20937 2.46479C8.31617 1.30919 7.46538 0.284399 6.30858 0.178799L4.38979 0L0.0110108 43.9402C-0.0921888 44.977 0.539008 45.9442 1.5278 46.2706L4.38859 47.2102L6.67698 22.6103Z"
      fill="#C2CE49"
    />
  </ImageIconSVG>
))

TraitBanner.displayName = 'TraitBanner'
