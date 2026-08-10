import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'

import AuthBg from './images/auth-bg.webp'

export const AuthenticationPageBackground = style({
  height: '400px',
  background: `linear-gradient(
      180deg,
      rgba(12, 6, 30, 1) 0%,
      rgba(12, 6, 30, 1) 12%,
      rgba(12, 6, 30, 0.5) 30%,
      rgba(12, 6, 30, 0) 40%,
      rgba(12, 6, 30, 0) 50%,
      rgba(12, 6, 30, 0) 60%,
      rgba(12, 6, 30, 1) 90%
    ), url(${AuthBg})
  `,
  backgroundSize: 'calc(100% + 400px)',
  backgroundPositionX: '-200px',
  backgroundRepeat: 'no-repeat',
  backgroundPositionY: '50%',
  ...responsiveStyle({
    tabletWide: {
      height: '900px',
      background: `linear-gradient(
          180deg,
          rgba(12, 6, 30, 1) 0%,
          rgba(12, 6, 30, 1) 5%,
          rgba(12, 6, 30, 0) 50%,
          rgba(12, 6, 30, 1) 95%
        ), url(${AuthBg})
      `,
      backgroundAttachment: 'fixed',
      backgroundPositionX: 'center',
      backgroundPositionY: 'center',
      backgroundSize: 'cover'
    }
  })
})

export const AuthenticationPageContainer = style({
  paddingTop: '32px',
  ...responsiveStyle({
    tabletWide: {
      paddingTop: '154px'
    }
  })
})

export const AuthenticationPageLogo = style({
  maxWidth: '228px',
  ...responsiveStyle({
    tabletWide: {
      maxWidth: '424.95px'
    }
  })
})

export const AuthenticationPageButtonWrapper = style({
  width: '300px',
  marginTop: '200px',
  ...responsiveStyle({
    tabletWide: { width: '261px', marginTop: '48px' }
  }),
  selectors: {
    '&.isSecondButton': {
      marginTop: '12px',
      ...responsiveStyle({
        tabletWide: {
          marginTop: '24px'
        }
      })
    }
  }
})
