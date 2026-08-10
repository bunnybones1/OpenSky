import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'
import { ThemeVars } from '~/shared/style/Theme.css'

export const DeckSelectorHeroStyle = style({
  height: '52px',
  opacity: 1,
  selectors: {
    '&.isLocked': {
      opacity: 0.3
    }
  }
})

export const DeckSelectorHeroImageWrapper = style({
  width: '52px'
})

export const DeckSelectorHeroTextWrapper = style({
  paddingRight: '2px',
  minWidth: '0px',
  maxWidth: '94px',
  ...responsiveStyle({
    tabletWide: {
      maxWidth: '178px'
    }
  })
})

export const DeckSelectorHeroTitle = style({
  whiteSpace: 'nowrap',
  maxWidth: '100%',
  textOverflow: 'ellipsis',
  textTransform: 'uppercase'
})

export const DeckSelectorHeroPrism = style({
  width: '42px'
})

export const DeckSelectorHeroLock = style({
  zIndex: 5,
  top: '50%',
  transform: 'translateY(-50%)',
  right: '-1.5%'
})

export const DeckSelectorHeroArrow = style({
  width: '24px',
  transition: 'border-color 0.125s ease-out',
  selectors: {
    [`${DeckSelectorHeroStyle}:hover &`]: {
      borderColor: ThemeVars.color.purple9
    }
  }
})
