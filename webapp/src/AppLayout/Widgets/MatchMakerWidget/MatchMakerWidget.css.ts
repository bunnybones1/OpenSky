import { style, styleVariants } from '@vanilla-extract/css'

import { ThemeVars } from '~/shared/style/Theme.css'

export const MatchMakerWidgetStyleBase = style({
  width: '317px',
  height: '106px',
  borderRadius: '4px'
})

export const MatchMakerWidgetStyle = styleVariants({
  blue: [
    MatchMakerWidgetStyleBase,
    {
      borderColor: '#52A2FF',
      boxShadow: '0px 0px 10px 0px #1A75FD'
    }
  ],
  green: [
    MatchMakerWidgetStyleBase,
    {
      borderColor: ThemeVars.color.forest7,
      boxShadow:
        '0px 0px 20px 0px #0C061E, 0px 4px 4px 0px rgba(0, 0, 0, 0.25), 0px 0px 10px 0px #4AD578'
    }
  ],
  orange: [
    MatchMakerWidgetStyleBase,
    {
      borderColor: ThemeVars.color.warm6,
      boxShadow:
        '0px 0px 20px 0px #0C061E, 0px 0px 20px 0px #0C061E, 0px 0px 10px 0px #FDB000'
    }
  ]
})

export const MatchMakerWidgetInner = style({
  gridTemplateColumns: '48px 1fr',
  borderRadius: '4px',
  overflow: 'hidden'
})
