import { style } from '@vanilla-extract/css'

import { ThemeVars } from '~/shared/style/Theme.css'

export const DeckSettingsModalStyle = style({
  width: '428px'
})

export const DeckSettingsModalDeckString = style({
  flex: 1,
  borderBottom: `1px solid ${ThemeVars.color.purple7}`,
  paddingBottom: '4px',
  textOverflow: 'ellipsis',
  overflow: 'hidden',
  whiteSpace: 'nowrap'
})

export const DeckSettingsCopyButton = style({
  width: '80px'
})

export const DeckSettingsFooter = style({
  height: '60px'
})

export const DeckSettingsFooterLeftSide = style({
  gridAutoColumns: 'min-content',
  gridAutoFlow: 'column',
  columnGap: '8px'
})
