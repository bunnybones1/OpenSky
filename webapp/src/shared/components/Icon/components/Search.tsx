import { memo } from 'react'

import { IconSVG } from '../shared/components/IconSVG'
import { IconSVGProps } from '../shared/types/icon-svg-props'

export const Search = memo(({ color, height }: IconSVGProps) => (
  <IconSVG boxWidth={48} boxHeight={48} color={color} height={height}>
    <path d="M47.3438 41.5312L37.9688 32.1562C37.5 31.7812 36.9375 31.5 36.375 31.5H34.875C37.4062 28.2188 39 24.0938 39 19.5C39 8.8125 30.1875 0 19.5 0C8.71875 0 0 8.8125 0 19.5C0 30.2812 8.71875 39 19.5 39C24 39 28.125 37.5 31.5 34.875V36.4688C31.5 37.0312 31.6875 37.5938 32.1562 38.0625L41.4375 47.3438C42.375 48.2812 43.7812 48.2812 44.625 47.3438L47.25 44.7188C48.1875 43.875 48.1875 42.4688 47.3438 41.5312ZM19.5 31.5C12.8438 31.5 7.5 26.1562 7.5 19.5C7.5 12.9375 12.8438 7.5 19.5 7.5C26.0625 7.5 31.5 12.9375 31.5 19.5C31.5 26.1562 26.0625 31.5 19.5 31.5Z" />
  </IconSVG>
))

Search.displayName = 'Search'
