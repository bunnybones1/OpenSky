import { CardStatus } from '~/types'

export const foilTypeStrings = ['silver', 'gold'] as const
export const foilContextTypeStrings = [
  'inspecting',
  'token',
  'dragging',
  'hand',
  'default',
  'none'
] as const

export type FoilType = (typeof foilTypeStrings)[number]
export type FoilContextType = (typeof foilContextTypeStrings)[number]

export function foilContextFromStatus(
  cardStatus?: CardStatus
): FoilContextType {
  switch (cardStatus) {
    case 'CardSelection':
      return 'default'
    case 'Dragging':
      return 'dragging'
    case 'Field':
      return 'token'
    case 'Hand':
      return 'hand'
    default:
      return 'inspecting'
  }
}
