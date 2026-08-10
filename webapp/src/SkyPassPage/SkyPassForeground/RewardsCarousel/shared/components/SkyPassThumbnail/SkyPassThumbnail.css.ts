import { globalStyle, keyframes, style, styleVariants } from '@vanilla-extract/css'

import { ThemeVars } from '~/shared/style/Theme.css'

export const ItemContainerBase = style({
  position: 'relative'
})

export const ItemContainer = styleVariants({
  primary: [
    ItemContainerBase,
    {
      border: `1px solid ${ThemeVars.color.purple6}`,
      background: ThemeVars.color.purple4
    }
  ],
  claim: [
    ItemContainerBase,
    {
      border: `1px solid ${ThemeVars.color.cold4}`,
      background: ThemeVars.color.cold2
    }
  ]
})

export const ItemBorderBase = style({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  cursor: 'pointer',
  transition: 'border 250ms',
  position: 'relative'
})

export const ItemBorder = styleVariants({
  primary: [
    ItemBorderBase,
    {
      border: `1px solid ${ThemeVars.color.purple8}`,
      selectors: {
        '&:hover': {
          border: `1px solid ${ThemeVars.color.white}`,
          boxShadow: `inset 0px 0px 0px 1px ${ThemeVars.color.white}`
        }
      }
    }
  ],
  selected: [
    ItemBorderBase,
    {
      border: `1px solid ${ThemeVars.color.white}`,
      boxShadow: `inset 0px 0px 0px 1px ${ThemeVars.color.white}`
    }
  ],
  claim: [
    ItemBorderBase,
    {
      border: `1px solid ${ThemeVars.color.cold5}`,
      boxShadow: `inset 0px 0px 0px 1px ${ThemeVars.color.cold7}`,
      selectors: {
        '&:hover': {
          border: `1px solid ${ThemeVars.color.white}`
        }
      }
    }
  ],
  claimed: [
    ItemBorderBase,
    {
      border: `1px solid ${ThemeVars.color.cold3}`,
      selectors: {
        '&:hover': {
          border: `1px solid ${ThemeVars.color.cold8}`
        }
      }
    }
  ]
})

export const ItemBorderOverlay = styleVariants({
  primary: [
    { position: 'absolute' },
    {
      height: '100%',
      width: '100%',
      transition: 'background 250ms',
      zIndex: 6,
      selectors: {
        '&:hover': {
          position: 'absolute',
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.25) 80%, rgba(255,255,255,1) 100%)',
          top: '0px',
          left: '0px'
        }
      }
    }
  ],
  selected: [
    { position: 'absolute' },
    {
      height: '100%',
      width: '100%',
      transition: 'background 250ms',
      position: 'absolute',
      zIndex: 6,
      background:
        'linear-gradient(180deg, rgba(255,255,255,0) 80%, rgba(255,255,255,1) 100%)',
      top: '0px',
      left: '0px',
      selectors: {
        '&:hover': {
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.25) 80%, rgba(255,255,255,1) 100%)'
        }
      }
    }
  ]
})

export const ItemBackgroundOverlayBase = style({
  position: 'absolute',
  opacity: 0.5,
  zIndex: 5
})

export const ItemBackgroundOverlay = styleVariants({
  primary: [
    { position: 'absolute' },
    {
      height: '100%',
      width: '100%'
    }
  ],
  claim: [
    ItemBackgroundOverlayBase,
    {
      background: ThemeVars.color.cold4,
      top: '1px',
      left: '1px',
      height: '60px'
    }
  ],
  claimSelected: [
    ItemBackgroundOverlayBase,
    {
      top: '1px',
      left: '1px',
      height: '60px'
    }
  ],
  claimed: [
    ItemBackgroundOverlayBase,
    {
      background: ThemeVars.color.cold1,
      height: '60px'
    }
  ]
})

export const ItemLocked = style({
  position: 'absolute',
  top: '3px',
  right: '2px',
  zIndex: 2,
  pointerEvents: 'none'
})

export const ItemClaimed = style({
  position: 'absolute',
  bottom: '4px',
  right: '5px',
  zIndex: 3,
  pointerEvents: 'none'
})

globalStyle(`${ItemClaimed} > svg`, {
  filter: `drop-shadow(0px -1px 6px ${ThemeVars.color.cold8})`
})

export const ItemAmount = style({
  position: 'absolute',
  bottom: '2px',
  right: '2px',
  fontSize: '14px',
  fontWeight: 'bold',
  width: '32px',
  height: '24px',
  fill: ThemeVars.color.white,
  filter: 'drop-shadow(0px 2px 2px rgba(0, 0, 0, 0.4))',
  zIndex: 2,
  pointerEvents: 'none'
})

export const ItemAmountText = style({
  fill: 'white',
  stroke: 'black',
  strokeWidth: '5px',
  strokeLinejoin: 'round',
  paintOrder: 'stroke',
  boxShadow: '0 0 10px',
  zIndex: 1
})

export const ItemThumbOverlay = style({
  position: 'absolute',
  top: '-64px',
  left: '-1px',
  background:
    'linear-gradient(180deg, rgba(255,255,255,0) 55%, rgba(112,0,255,1) 140%)',
  borderWidth: '2px',
  borderStyle: 'solid',
  borderImage:
    'linear-gradient(to bottom, rgba(255,255,255,0) 75%, rgba(255,255,255,1)) 1 100%',
  borderTop: 'none'
})

export const ItemThumbInnerOverlayBase = style({
  position: 'absolute',
  top: '1px',
  left: '-1px',
  zIndex: 3
})

export const ItemThumbInnerOverlay = styleVariants({
  primary: [
    ItemThumbInnerOverlayBase,
    {
      background:
        'linear-gradient(180deg, rgba(255,255,255,0) 46%, rgba(112,0,255,0.32) 82%, rgba(255,255,255,0.8) 105%)'
    }
  ],
  claim: [
    ItemThumbInnerOverlayBase,
    {
      background:
        'linear-gradient(180deg, rgba(255,255,255,0) 46%, rgba(0, 56, 255,0.32) 82%, rgba(255,255,255,0.8) 105%)'
    }
  ]
})

const Pulse = keyframes({
  '0%, 100%': { opacity: 0 },
  '50%': { opacity: 1 }
})

export const ItemThumbInnerOverlayPulse = style({
  position: 'absolute',
  top: '1px',
  left: '-1px',
  zIndex: 3,
  background:
    'linear-gradient(180deg, rgba(255,255,255,0) 46%, rgba(112,0,255,0.32) 82%, rgba(255,255,255,1) 100%)',
  animation: `${Pulse} 1s linear infinite`
})
