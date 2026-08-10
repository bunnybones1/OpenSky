import { style } from '@vanilla-extract/css'

import { CARD_RATIO } from '~/shared/constants/ui'

export const CardOuterStyle = style({
  width: '100%',
  position: 'relative'
})

export const CardWrapperStyle = style({
  width: '100%',
  paddingTop: `calc(${CARD_RATIO} * 100%)`,
  position: 'relative',
  opacity: 1,
  transition: 'opacity 0.2s ease-out',
  selectors: {
    '&.isLocked': {
      opacity: 0.65
    },
    [`${CardOuterStyle}:hover &`]: {
      opacity: 1
    }
  }
})

export const KeywordsOuterStyle = style({
  zIndex: 10
})

export const KeywordsWrapperStyle = style({
  display: 'grid',
  gridTemplateRows: '1fr',
  rowGap: '8px'
})

export const CardLockStyle = style({
  opacity: 1,
  transition: 'opacity 0.125s ease-in-out',
  top: '50%',
  transform: 'translateY(-50%)',
  zIndex: 10,
  selectors: {
    [`${CardOuterStyle}:hover &`]: {
      opacity: 0
    }
  }
})
