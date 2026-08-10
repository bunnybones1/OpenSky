import { style } from '@vanilla-extract/css'

export const BaseTextStyle = style({
  fontStyle: 'normal',
  lineHeight: '1em',
  selectors: {
    '&.uppercase': {
      textTransform: 'uppercase'
    },
    '&.noWrap': {
      whiteSpace: 'nowrap'
    }
  }
})
