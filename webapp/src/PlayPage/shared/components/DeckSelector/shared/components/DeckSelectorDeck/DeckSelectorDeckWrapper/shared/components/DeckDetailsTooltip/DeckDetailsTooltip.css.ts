import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'

export const Container = style({
  display: 'grid',
  gridTemplateRows: '30px 1fr 50px',
  background: '#1c1038',
  position: 'relative',
  height: '80vh',
  width: 'calc(100vw - 400px)',
  maxHeight: '380px',
  maxWidth: '350px',
  minWidth: '200px',
  selectors: {
    '&.isTouchTooltip': {
      gridTemplateRows: '30px 1fr 8px'
    }
  },
  ...responsiveStyle({
    tabletWide: { width: '350px', height: '380px' }
  })
})

export const TouchGradient = style({
  height: '50px',
  background:
    'linear-gradient(0deg, rgba(28,16,56,1) 0%, rgba(28,16,56,1) 40%, rgba(28,16,56,0) 100%)'
})
