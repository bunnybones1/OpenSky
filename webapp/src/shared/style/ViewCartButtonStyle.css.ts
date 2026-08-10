import { style } from '@vanilla-extract/css'

export const ViewOrderButtonStyle = style({
  zIndex: 14
})

export const ViewOrderButtonGradient = style({
  width: '360px',
  height: '360px',
  right: '-120px',
  bottom: '-180px',
  background: `radial-gradient(circle at center center, 
    rgba(12,6,30,1) 0%, rgba(12,6,30,0.6) 40%, rgba(12,6,30,0) 50%)`
})

export const ViewOrderButtonBadge = style({
  width: '28px',
  height: '20px',
  borderRadius: '12px',
  right: '8px',
  top: '-8px',
  transition: 'transform 0.2s ease-in'
})
