import { style } from '@vanilla-extract/css'

export const WalletConnectionsPanel = style({
  width: 'min(560px, calc(100% - 32px))',
  margin: '32px auto 0',
  padding: '20px',
  border: '1px solid #4d3c7b',
  borderRadius: '4px',
  background: 'rgba(23, 13, 48, 0.92)'
})

export const WalletRow = style({
  width: '100%',
  marginTop: '12px',
  padding: '14px',
  border: '1px solid #3c2b68',
  borderRadius: '4px',
  background: '#21143e'
})

export const WalletAddress = style({
  minWidth: 0,
  overflow: 'hidden',
  color: '#ffffff',
  fontFamily: 'Roboto Mono, monospace',
  fontSize: '13px',
  lineHeight: '18px',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap'
})

export const WalletTotals = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(115px, 1fr))',
  gap: '8px',
  width: '100%',
  marginTop: '12px'
})

export const WalletTotal = style({
  padding: '8px 10px',
  borderRadius: '3px',
  background: '#170d30',
  color: '#ac8fff',
  fontSize: '12px',
  lineHeight: '18px'
})

export const WalletMessage = style({
  marginTop: '12px',
  color: '#ac8fff',
  fontSize: '13px',
  lineHeight: '19px',
  textAlign: 'center'
})

export const WalletError = style({
  marginTop: '12px',
  color: '#ff8f9d',
  fontSize: '13px',
  lineHeight: '19px',
  textAlign: 'center'
})
