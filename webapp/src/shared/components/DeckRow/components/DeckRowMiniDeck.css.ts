import { style } from '@vanilla-extract/css'

export const DeckRowMiniDeckStyle = style({
  height: '56px',
  width: '56px',
  zIndex: 1,
  selectors: {
    '&.isLarge': {
      height: '80px',
      width: '80px'
    }
  }
})

export const MiniDeckArtWrapper = style({
  transform: 'translateX(-50%)',
  left: '50%',
  top: '34%',
  zIndex: 2,
  width: '86.03%',
  height: '63%',
  backgroundColor: 'green',
  overflow: 'hidden'
})

export const MiniDeckArt = style({
  top: '50%',
  transform: 'translateY(-50%)',
  zIndex: 2
})

export const MiniDeckBody = style({
  zIndex: 3
})

export const MiniDeckTop = style({
  zIndex: 5
})

export const MiniDeckHighlight = style({
  zIndex: 4,
  opacity: 0,
  transition: 'opacity 0.125s ease-in',
  selectors: {
    '&.isHighlighted': {
      opacity: 1
    }
  }
})

export const MiniDeckHex = style({
  width: '36px',
  zIndex: 6,
  bottom: '-11%',
  left: '50%',
  transform: 'translateX(-50%)',
  height: '36px',
  selectors: {
    '&.isLarge': {
      height: '52px',
      width: '52px'
    }
  }
})
