import { Element, Type } from '@skyweaver/state-metadata'

export const elementSymbols: { [K in Element]: string } = {
  light: '☼',
  mind: '☻',
  fire: '❖',
  air: '❉',
  water: '❆',
  earth: '⚚',
  metal: '☬',
  dark: '☽',
  sky: 'x'
}
export const cardTypeSymbols: { [K in Type]: string } = {
  hero: '☿',
  unit: '☿',
  enchant: '⦿',
  spell: '✦',
  heroAbility: '✦'
}

type FontIcon =
  | 'SwitchSides'
  | 'GearHand'
  | 'MagicWand'
  | 'SeekNext'
  | 'SeekPrev'
  | 'Play'
  | 'GamePad'
  | 'Pencil'
  | 'Debuff'
  | 'Buff'

export const fontIconSymbols: { [K in FontIcon]: string } = {
  SwitchSides: '⚀',
  GearHand: '⚁',
  MagicWand: '⚂',
  SeekNext: '⚃',
  SeekPrev: '⚄',
  Play: '⚅',
  GamePad: '⚆',
  Pencil: '⚇',
  Debuff: '⚈',
  Buff: '⚉'
}
