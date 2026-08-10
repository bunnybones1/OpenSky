import { memo } from 'react'

import { IconSVG } from '../shared/components/IconSVG'
import { IconSVGProps } from '../shared/types/icon-svg-props'

export const OpenSkyFull = memo(({ color, height }: IconSVGProps) => (
  <IconSVG boxWidth={125} boxHeight={39} color={color} height={height}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12.1381 0.155029L19.1346 7.09538L20.7412 8.68538L23.4188 11.3566V27.3705L12.1381 38.5933L5.14151 31.6529L3.53495 30.0497L0.835938 27.3811V11.3672L12.1381 0.155029ZM10.5315 23.112L8.38943 20.9761L6.78288 19.3728L12.1648 14.0357L17.6405 8.60323L12.1381 3.17338L2.97801 12.2496V26.496L5.03976 28.5418L10.5315 23.112ZM21.2954 26.496V12.2496L19.2364 10.2065L13.7527 15.6363L15.8947 17.7722L17.5013 19.3622L12.1193 24.702L6.66239 30.1424L12.1381 35.5723L21.2954 26.496Z"
    />
    <text
      x="76"
      y="27"
      fontFamily="Barlow Condensed, sans-serif"
      fontSize="22"
      fontWeight="600"
      letterSpacing="2"
      textAnchor="middle"
    >
      OPENSKY
    </text>
  </IconSVG>
))

OpenSkyFull.displayName = 'OpenSkyFull'
