import { style } from '@vanilla-extract/css'

export const FancyBackButtonStyle = style({
  paddingTop: '100%'
})

export const FancyActiveBackButtonStyle = style({
  opacity: 0,
  transition: 'opacity 0.2s ease-in',
  selectors: {
    [`${FancyBackButtonStyle}:hover &`]: {
      opacity: 1
    },
    [`${FancyBackButtonStyle}:active &`]: {
      opacity: 1
    }
  }
})
