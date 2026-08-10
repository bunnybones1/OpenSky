import { style } from '@vanilla-extract/css'

import { ThemeVars } from '~/shared/style/Theme.css'

export const DeckRowStyle = style({
  paddingLeft: '28px',
  position: 'relative',
  opacity: 1,
  selectors: {
    '&.isLarge': {
      paddingLeft: '40px'
    },
    '&.isLocked': {
      opacity: 0.5
    }
  }
})

export const DeckRowWrapperStyle = style({
  height: '52px',
  width: '100%',
  position: 'relative',
  selectors: {
    '&.isLarge': {
      height: '74px',
      width: '400px'
    }
  }
})

export const DeckRowSmallIcon = style({
  top: '4%',
  right: '77%',
  zIndex: 2
})

export const DeckRowPrism = style({
  top: '50%',
  transform: 'translateY(-50%)',
  right: '6px',
  height: '44px',
  width: '44px',
  zIndex: 3,
  selectors: {
    '&.isLarge': {
      height: '62px',
      width: '62px'
    },
    '&.hasDropdown': {
      right: '24px'
    }
  }
})

export const DeckRowDropdownArea = style({
  width: '25px',
  border: `1px solid ${ThemeVars.color.purple7}`,
  zIndex: 3,
  transition: '0.2s ease-in',
  selectors: {
    '&.isLarge': {
      width: '35px'
    },
    [`${DeckRowStyle}:hover &`]: {
      borderColor: ThemeVars.color.purple9
    }
  }
})

export const DeckRowLock = style({
  zIndex: 4,
  top: '50%',
  transform: 'translateY(-50%)',
  right: '-1.5%'
})
