import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'

export const StickerContainer = style({
  position: 'absolute',
  transform: 'rotate(20deg)',
  width: '105px',
  right: '10px',
  top: '10%',
  ...responsiveStyle({
    mobile: { width: '125px', right: '20px', top: '12%' },
    tablet: { width: '325px', right: '75px', top: '18%' },
    tabletWide: { width: '38vh', right: '125px', top: '18vh%' },
    desktop: { width: '400px', right: '125px', top: '20%%' }
  })
})

export const SecondaryStickerContainer = style({
  position: 'absolute',
  filter: ' brightness(160%)',
  transform: 'rotate(12deg)',
  width: '125px',
  height: '125px',
  right: '75px',
  top: '-5%',
  ...responsiveStyle({
    mobile: { width: '150px', height: '150px', right: '100px', top: '-2%' },
    tablet: { width: '275px', height: '275px', right: '275px', top: '-3%' },
    tabletWide: { width: '275px', height: '275px', right: '340px', top: '-4%' },
    desktop: { width: '325px', height: '325px', right: '375px', top: '-5%' }
  })
})
