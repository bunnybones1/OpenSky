import { style } from '@vanilla-extract/css'

export const AttachedSpellOverlayStyle = style({
  position: 'absolute',
  cursor: 'pointer',
  top: '44%',
  right: '2%',
  zIndex: 10,
  width: '30%',
  height: '20%',
  borderRadius: '50%',
  background: 'transparent'
})

export const AttachedSpellCardStyle = style({
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
