import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'

export const IdentityActions = style({
  width: '300px',
  marginTop: '96px',
  textAlign: 'center',
  ...responsiveStyle({
    tabletWide: {
      width: '300px',
      marginTop: '48px'
    }
  })
})

export const IdentityButton = style({
  marginTop: '12px',
  selectors: {
    '&:first-of-type': { marginTop: '20px' }
  }
})

export const IdentityProfile = style({
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '12px',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: '8px',
  background: 'rgba(12, 6, 30, 0.72)',
  textAlign: 'left'
})

export const IdentityAvatar = style({
  width: '44px',
  height: '44px',
  flex: '0 0 44px',
  borderRadius: '50%',
  objectFit: 'cover',
  background: 'rgba(255, 255, 255, 0.12)'
})

export const IdentityCopy = style({
  minWidth: 0,
  overflow: 'hidden'
})

export const IdentityEmail = style({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap'
})

export const IdentityStatus = style({
  marginTop: '12px',
  color: '#ffd5d5',
  fontSize: '14px',
  lineHeight: 1.4
})
