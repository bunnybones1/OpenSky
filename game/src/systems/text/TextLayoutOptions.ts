import { TextOptions } from './TextOptions'

const centered: Partial<TextOptions> = {
  align: 'center',
  vAlign: 'center'
}
const left: Partial<TextOptions> = {
  ...centered,
  align: 'left'
}
const right: Partial<TextOptions> = {
  ...centered,
  align: 'right'
}
const cardText: Partial<TextOptions> = {
  ...centered,
  width: 112
}
const cardHeroAbilityText: Partial<TextOptions> = {
  ...centered,
  width: 100
}
const speechBubble: Partial<TextOptions> = {
  ...centered,
  lineHeight: 1.5
}
const infoFlyout: Partial<TextOptions> = {
  ...left,
  vAlign: 'top',
  lineHeight: 1.25
}

const tooltip: Partial<TextOptions> = {
  ...left,
  vAlign: 'bottom',
  lineHeight: 1.25
}

export const textLayouts = {
  centered,
  left,
  right,
  cardText,
  cardHeroAbilityText,
  speechBubble,
  infoFlyout,
  tooltip
}
