import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'
import { ThemeVars } from '~/shared/style/Theme.css'

export const Container = style({
  container: 'shopBox / size',
  selectors: {
    '&.isVertical': {
      aspectRatio: '170 / 290',
      ...responsiveStyle({
        tabletWide: {
          aspectRatio: '238 / 406'
        }
      })
    },
    '&.isHorizontal': {
      aspectRatio: '526 / 290',
      ...responsiveStyle({
        tabletWide: {
          aspectRatio: '736 / 406'
        }
      })
    }
  }
})

export const Inner = style({
  selectors: {
    '&.isVertical': {
      clipPath:
        'polygon(8cqw 0.4cqw, calc(99.5% - 8cqw) 0.4cqw, 99.5% 8cqw, 99.5% calc(99.5% - 8cqw), calc(99.5% - 8cqw) 99.5%, 8cqw 99.5%, 0.4cqw calc(99.5% - 8cqw), 0.4cqw 8cqw)'
    },
    '&.isHorizontal': {
      clipPath:
        'polygon(2.4cqw 0.4cqw, calc(99.5% - 2.4cqw) 0.4cqw, 99.5% 2.4cqw, 99.5% calc(99.5% - 2.4cqw), calc(99.5% - 2.4cqw) 99.5%, 2.4cqw 99.5%, 0.4cqw calc(99.5% - 2.4cqw), 0.4cqw 2.4cqw)'
    }
  }
})

export const Glow = style({
  selectors: {
    '&.isHovered': {
      filter: 'drop-shadow(0px 0px 6px #632DFF)',
      transition: 'all 250ms'
    }
  }
})

export const SoldOutBanner = style({
  width: 'calc(100% - 1px)',
  ...responsiveStyle({
    tablet: {
      width: 'calc(100% - 2px)'
    }
  })
})

export const ShopBoxGradient = style({
  background: `linear-gradient(180deg, rgba(0,0,0,0) 30%, ${ThemeVars.color.purple4} 87%)`
})
