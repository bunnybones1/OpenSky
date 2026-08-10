import { memo } from 'react'

import { IconSVG } from '../shared/components/IconSVG'
import { IconSVGProps } from '../shared/types/icon-svg-props'

export const Deck = memo(({ color, height }: IconSVGProps) => (
  <IconSVG boxWidth={48} boxHeight={48} color={color} height={height}>
    <path d="M30.2018 2.33047L16.4932 0L3.46997 3.64257L18.0794 23.5592L32.5714 27.3585L45.7513 20.3671L30.2018 2.33047ZM31.1418 21.2092L20.8408 18.4087L12.3414 6.77598L20.1749 4.5826L28.3805 5.97304L37.957 17.2729L31.1418 21.2092Z" />
    <path
      d="M3 15.0599V8.73438L17.3549 28.7686L32.9436 32.3328L45.7513 25.6352V31.7453L32.2581 38.3842L15.4357 34.8003L3 15.0599ZM3 28.1225V21.7773L13.9669 38.1689L33.1394 42.0074L45.6338 35.6426L45.7513 41.5765L33.3352 48L12.929 44.142L3 28.1225Z"
      fillOpacity={0.65}
    />
  </IconSVG>
))

Deck.displayName = 'Deck'
