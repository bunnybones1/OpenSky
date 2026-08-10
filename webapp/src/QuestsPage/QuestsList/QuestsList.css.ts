import { style } from '@vanilla-extract/css'

export const QuestsBackground = style({
  objectFit: 'cover',
  left: '50%',
  transform: 'translateX(-50%)'
})

export const QuestListStyle = style({
  gridAutoColumns: '1fr',
  gridAutoFlow: 'column',
  maxWidth: '1300px',
  justifyItems: 'center'
})
