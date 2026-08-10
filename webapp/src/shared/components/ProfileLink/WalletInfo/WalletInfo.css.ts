import { style } from '@vanilla-extract/css'

export const WalletInfoImage = style({
  width: '16px',
  height: '16px'
})

export const WalletInfoText = style({
  textShadow: '0px 0px 3px black, 0px 0px 2px black'
})

export const WalletInfoStyle = style({
  right: '28px',
  height: 'calc(100% - 8px)',
  background: 'linear-gradient(270deg, #221544 61.26%, rgba(34, 21, 69, 0) 100%)'
})
