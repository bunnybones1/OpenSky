import { style } from '@vanilla-extract/css'

export const FancyCloseButtonStyle = style({
  paddingTop: '100%'
})

export const FancyActiveCloseButtonStyle = style({
  opacity: 0,
  transition: 'opacity 0.2s ease-in',
  selectors: {
    [`${FancyCloseButtonStyle}:hover &`]: {
      opacity: 1
    },
    [`${FancyCloseButtonStyle}:active &`]: {
      opacity: 1
    }
  }
})
