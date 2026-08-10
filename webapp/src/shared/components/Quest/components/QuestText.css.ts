import { style } from '@vanilla-extract/css'

export const QuestTextStyle = style({
  width: '75%',
  height: '33%',
  top: '36%',
  left: '50%',
  transform: 'translateX(-50%)',
  padding: '0px 3%',
  containerType: 'inline-size'
})

export const QuestTextDescription = style({
  lineHeight: '1.3em',
  fontSize: '8.5cqw'
})

export const QuestTextTitle = style({
  textTransform: 'uppercase',
  fontSize: '6cqw'
})
