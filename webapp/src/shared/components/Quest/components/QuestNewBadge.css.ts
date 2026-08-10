import { style } from '@vanilla-extract/css'

export const QuestNewBadgeStyle = style({
  width: '22.43%',
  height: '16.61%',
  top: '3%',
  left: '1%',
  zIndex: 12,
  borderRadius: '100%'
})

export const QuestNewBadgeInner = style({
  width: 'calc(100% - 10px)',
  height: 'calc(100% - 10px)',
  boxShadow: '0px 0px 6px 2px rgba(253, 150, 0, 0.3)',
  borderRadius: '100%',
  containerType: 'inline-size'
})

export const QuestNewBadgeText = style({
  fontSize: '25cqw'
})
