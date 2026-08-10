import { style } from '@vanilla-extract/css'

export const WalletInfoGrid = style({
  display: 'grid',
  gridTemplateColumns: '20px 1fr',
  gap: '4px'
})

export const WalletInfoImage = style({ width: '20px' })

export const WalletInfoValue = style({
  textAlign: 'start'
})
