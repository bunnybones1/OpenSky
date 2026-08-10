import { createTheme, keyframes, style } from '@vanilla-extract/css'
import { createSprinkles, defineProperties } from '@vanilla-extract/sprinkles'

import { ThemeVars } from '~/shared/style/Theme.css'

export const CardInfoBoxDescStyle = style({
  paddingRight: '8px',
  selectors: {
    '&.needsExtraPadding': {
      paddingRight: '58px'
    }
  }
})

const FadeIn = keyframes({
  '0%': {
    opacity: 0
  },
  '100%': {
    opacity: 1
  }
})

export const [themeClass, vars] = createTheme({
  traitColors: {
    armor: '#70C1F8',
    banner: '#C2CE49',
    guard: '#61DAC5',
    lifesteal: '#EE7EFF',
    stealth: '#8482B5',
    wither: '#F251C1',
    dash: '#9BD572',
    generic: ThemeVars.color.purple7
  },
  dimTraitColors: {
    armor: 'rgba(112, 193, 248, 0.4)',
    banner: 'rgba(194, 206, 73, 0.4)',
    guard: 'rgba(97, 218, 197, 0.4)',
    lifesteal: 'rgba(238, 126, 255, 0.4)',
    stealth: 'rgba(132, 130, 181, 0.4)',
    wither: 'rgba(242, 81, 193, 0.4)',
    dash: 'rgba(155, 213, 114, 0.4)',
    generic: 'rgba(112, 91, 171, 0.4)'
  }
})

export const CardInfoBoxOuterStyle = style({
  width: '260px',
  borderWidth: '2px',
  borderStyle: 'solid',
  borderColor: ThemeVars.color.purple1,
  borderRadius: '6px',
  overflow: 'hidden',
  animationName: FadeIn,
  animationDuration: '0.2s',
  animationIterationCount: 1,
  animationTimingFunction: 'ease-in-out'
})

export const InfoBoxBaseStyle = style({
  width: '100%',
  borderRadius: '6px',
  borderStyle: 'solid',
  overflow: 'hidden',
  borderWidth: '1px',
  paddingLeft: '10px'
})

export const TraitTitleStyle = style({
  borderBottomLeftRadius: '8px',
  position: 'relative',
  '::before': {
    content: '',
    position: 'absolute',
    top: '0px',
    left: '-12px',
    width: '0px',
    height: '0px',
    borderStyle: 'solid',
    borderWidth: '0 13px 18px 0',
    borderColor: `transparent currentColor transparent transparent`
  }
})

const cardInfoBoxColorProperties = defineProperties({
  properties: {
    borderColor: vars.traitColors,
    background: vars.dimTraitColors,
    backgroundColor: vars.traitColors,
    color: vars.traitColors
  }
})

export const CardInfoBoxSprinkles = createSprinkles(cardInfoBoxColorProperties)

export const DescriptionWrapper = style({
  flex: 1
})

export const DescriptionStrong = style({ color: ThemeVars.color.white })
