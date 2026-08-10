import { keyframes, style, styleVariants } from '@vanilla-extract/css'

import { CARD_RATIO } from '~/shared/constants/ui'
import { BASE_COLUMN_GAP } from '~/shared/constants/ui'
import { ThemeVars } from '~/shared/style/Theme.css'

export const CardListLoaderStyle = style({
  columnGap: `${BASE_COLUMN_GAP}px`
})

export const CardListLoaderColumns = styleVariants({
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
  8: {
    gridTemplateColumns: 'repeat(8, 1fr)'
  }
})

export const CardLoaderWrapperStyle = style({
  paddingTop: `calc(${CARD_RATIO} * 100%)`
})

const CardLoaderSkeleton = keyframes({
  '0%': {
    backgroundPosition: '0%'
  },
  '100%': {
    backgroundPosition: '200%'
  }
})

export const CardLoaderStyle = style({
  width: '90%',
  right: '3.5%',
  height: '92%',
  top: '4.8%',
  clipPath: 'polygon(50% 0, 100% 12%, 100% 88%, 50% 100%, 0 88%, 0 12%)',
  background: `linear-gradient(to right, ${ThemeVars.color.purple3}, ${ThemeVars.color.purple4}, ${ThemeVars.color.purple3})`,
  backgroundSize: '200%',
  backgroundPosition: '0%',
  animation: `${CardLoaderSkeleton} 1.5s ease-in-out infinite`
})

export const LoaderOverlay = style({
  background:
    'linear-gradient(0deg, rgba(12,6,30,1) 0%, rgba(12,6,30,0.8) 40%, rgba(12,6,30,0) 100%)'
})
