import { style } from '@vanilla-extract/css'

import { ThemeVars } from '~/shared/style/Theme.css'

export const ItemsDeckButtonWrapper = style({
  paddingTop: 'calc((153 / 100) * 100%)'
})

export const ItemsDeckButtonStyle = style({
  zIndex: 1
})

export const ItemsDeckButtonHighlight = style({
  opacity: 0,
  userSelect: 'none',
  zIndex: 1,
  transition: 'opacity 0.2s ease-in',
  '@media': {
    '(hover)': {
      selectors: {
        [`${ItemsDeckButtonStyle}:hover &`]: {
          opacity: 1
        }
      }
    }
  }
})

export const ItemsDeckButtonTop = style({
  zIndex: 6,
  userSelect: 'none'
})

export const ItemsDeckButtonFrame = style({
  zIndex: 5,
  userSelect: 'none'
})

export const ItemsDeckButtonPlus = style({
  width: '24%',
  height: '16%',
  position: 'absolute',
  left: '38%',
  top: '80%',
  borderRadius: '50%',
  zIndex: 4,
  backgroundColor: ThemeVars.color.purple4
})

export const ItemsDeckButtonArt = style({
  height: '56%',
  top: '17.5%',
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 2
})

export const ItemsDeckButtonGradient = style({
  width: '76%',
  bottom: '10.5%',
  height: '70%',
  left: '50%',
  transform: 'translateX(-50%)',
  background: `linear-gradient(358.11deg, ${ThemeVars.color.purple4} 27.67%, rgba(35, 20, 69, 0) 53%)`,
  zIndex: 3
})

export const ItemsDeckButtonText = style({
  width: '80%',
  zIndex: 10,
  top: '50%',
  padding: '0px 10px',
  position: 'absolute',
  left: '50%',
  transform: 'translateX(-50%)',
  textShadow:
    '0 0 3px black, 0 0 3px black, 0 0 3px black, 0 0 3px black, 0 0 3px black,0 0 3px black, 0 0 3px black, 0 0 3px black, 0 0 3px black, 0 0 3px black,0 0 3px black, 0 0 3px black, 0 0 3px black, 0 0 3px black, 0 0 3px black,0 0 3px black, 0 0 3px black, 0 0 3px black, 0 0 3px black, 0 0 3px black'
})
