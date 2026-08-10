import { style } from '@vanilla-extract/css'

export const XPBarStyle = style({
  height: '6px',
  left: '1px',
  width: 'calc(100% - 2px)'
})

export const XPBarBlock = style({
  width: 'calc(100% - 4px)',
  height: '2px',
  bottom: '2px',
  left: '2px'
})

export const XpBarBar = style({
  height: '2px',
  left: '2px',
  bottom: '2px'
})

export const XpBarLevelBlock = style({
  height: '14px',
  width: '32px',
  zIndex: 5,
  left: '-1.2px',
  bottom: '2px',
  transform: 'skew(20deg)',
  background:
    'linear-gradient(to bottom, #48e4ff 0%, #48e4ff 29%, #48e4ff 49%, #00d7fd 50%, #00d7fd 100%)'
})

export const XpBarLevelBlockTwo = style({
  height: '2px',
  width: '8px',
  left: '30px',
  zIndex: 4,
  bottom: '2px',
  transform: 'skew(20deg)',
  backgroundColor: 'rgba(35, 20, 69, 0.5)'
})

export const XpBarLevelTextWrapper = style({
  height: '14px',
  width: '32px',
  zIndex: 6,
  left: '-1.2px',
  bottom: '2px'
})
