import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'
import { ThemeVars } from '~/shared/style/Theme.css'

export const Wrapper = style({
  width: ThemeVars.sizes.dialogMaxHeight,
  maxHeight: ThemeVars.sizes.dialogMaxWidth,
  height: 'auto',
  ...responsiveStyle({
    tabletWide: { maxWidth: '600px' }
  })
})

export const ErrorIcon = style({
  width: '64px',
  height: '64px'
})

export const Textarea = style({
  height: '4px',
  borderRadius: '4px',
  border: `1px solid ${ThemeVars.color.warm3}`
})

export const ButtonRow = style({
  height: '84px'
})

export const ErrorStack = style({
  borderRadius: '4px',
  resize: 'vertical',
  background:
    'linear-gradient(to top, rgba(171, 91, 91, 0.35), rgba(171, 91, 91, 0))',
  height: '80px',
  textOverflow: 'ellipsis',
  overflow: 'hidden',
  wordWrap: 'break-word'
  // whiteSpace: 'nowrap'
})
