import { keyframes, style, styleVariants } from '@vanilla-extract/css'

import { DECK_RATIO } from '~/shared/constants/ui'
import { BASE_COLUMN_GAP } from '~/shared/constants/ui'
import { ThemeVars } from '~/shared/style/Theme.css'

export const DecksListLoaderStyle = style({
  columnGap: `${BASE_COLUMN_GAP}px`
})

export const DeckListLoaderColumns = styleVariants({
  2: {
    gridTemplateColumns: 'repeat(2, 1fr)'
  },
  3: {
    gridTemplateColumns: 'repeat(3, 1fr)'
  },
  4: {
    gridTemplateColumns: 'repeat(4, 1fr)'
  },
  5: {
    gridTemplateColumns: 'repeat(5, 1fr)'
  },
  6: {
    gridTemplateColumns: 'repeat(6, 1fr)'
  },
  7: {
    gridTemplateColumns: 'repeat(7, 1fr)'
  },
  8: {
    gridTemplateColumns: 'repeat(8, 1fr)'
  }
})

export const DeckLoaderWrapperStyle = style({
  paddingTop: `calc(${DECK_RATIO} * 100%)`
})

const DeckLoaderSkeleton = keyframes({
  '0%': {
    backgroundPosition: '0%'
  },
  '100%': {
    backgroundPosition: '200%'
  }
})

export const DeckLoaderStyle = style({
  width: '90%',
  right: '3.5%',
  height: '92%',
  top: '4.8%',
  clipPath:
    'polygon(50% 0, 90% 6%, 96% 14%, 96% 92%, 67% 92%, 50% 97%, 33% 92%, 4% 92%, 4% 14%, 10% 6%)',
  background: `linear-gradient(to right, ${ThemeVars.color.purple3}, ${ThemeVars.color.purple4}, ${ThemeVars.color.purple3})`,
  backgroundSize: '200%',
  backgroundPosition: '0%',
  animation: `${DeckLoaderSkeleton} 1.5s ease-in-out infinite`
})

export const LoaderOverlay = style({
  background:
    'linear-gradient(0deg, rgba(12,6,30,1) 0%, rgba(12,6,30,0.8) 40%, rgba(12,6,30,0) 100%)'
})
