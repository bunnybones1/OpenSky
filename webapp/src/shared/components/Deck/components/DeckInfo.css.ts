import { style } from '@vanilla-extract/css'

import { ThemeVars } from '~/shared/style/Theme.css'

import { DECK_Z_INDEXES } from '../shared/constants'

export const DeckInfoStyle = style({
  width: '76%',
  bottom: '23.5%',
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: DECK_Z_INDEXES.DECK_INFO
})

export const DeckNameStyle = style({
  maxWidth: '100%',
  textOverflow: 'ellipsis',
  padding: '0px 8px',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  letterSpacing: '1px',
  marginBottom: '8px',
  lineHeight: '25px',
  textShadow:
    '0 0 3px black, 0 0 3px black, 0 0 3px black, 0 0 3px black, 0 0 3px black,0 0 3px black, 0 0 3px black, 0 0 3px black, 0 0 3px black, 0 0 3px black,0 0 3px black, 0 0 3px black, 0 0 3px black, 0 0 3px black, 0 0 3px black,0 0 3px black, 0 0 3px black, 0 0 3px black, 0 0 3px black, 0 0 3px black'
})

export const DeckStatsWrapper = style({
  width: '100%',
  height: '24px',
  overflow: 'hidden'
})

export const DeckInfoHeroWrapper = style({
  marginTop: 'auto'
})

export const DeckInfoHero = style({
  height: '25px',
  width: '25px',
  borderRadius: '50%',
  border: `1px solid ${ThemeVars.color.purple7}`
})

export const DeckInfoHeroImage = style({
  width: '145%',
  transform: 'translate(-14%, -16%)'
})
