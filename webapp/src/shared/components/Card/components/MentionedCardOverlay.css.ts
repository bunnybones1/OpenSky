import { style } from '@vanilla-extract/css'

export const MentionedCardOverlayStyle = style({
  position: 'absolute',
  top: '65%',
  right: '10%',
  zIndex: 10,
  width: '76%',
  height: '18%'
})

export const MentionedCardStyle = style({
  zIndex: 11,
  transition: 'opacity 0.2s ease-out',
  opacity: 0,
  pointerEvents: 'none',
  selectors: {
    '&.shouldShow': {
      opacity: 1
    }
  }
})
