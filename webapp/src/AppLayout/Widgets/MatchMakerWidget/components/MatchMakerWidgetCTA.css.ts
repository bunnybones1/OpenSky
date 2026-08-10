import { style } from '@vanilla-extract/css'

export const MatchMakerWidgetCTAStyle = style({
  transition: '0.125s ease-out',
  selectors: {
    '&:hover': {
      filter: 'brightness(125%)'
    }
  }
})
