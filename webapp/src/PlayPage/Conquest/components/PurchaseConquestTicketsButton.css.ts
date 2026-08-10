import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'

export const PurchaseConquestTicketsButtonStyle = style({
  right: '24px',
  top: '12px',
  opacity: 0.5,
  transition: '0.25s ease-out',
  ...responsiveStyle({
    tabletWide: {
      top: '24px'
    }
  }),
  selectors: {
    '&.isTicketHolder': {
      opacity: 1
    },
    '&:hover': {
      opacity: 1
    }
  }
})

export const PurchaseConquestTicketsButtonTicketsWrapper = style({
  height: '56px',
  width: '56px'
})

export const PurchaseConquestTicketsButtonImage = style({
  filter: 'none',
  selectors: {
    '&.isTicketHolder': {
      filter: 'hue-rotate(154deg)'
    }
  }
})

export const PurchaseConquestTicketsButtonBalance = style({
  borderRadius: '12px',
  height: '24px',
  minWidth: '24px'
})
