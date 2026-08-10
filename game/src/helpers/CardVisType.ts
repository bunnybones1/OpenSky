type CardVisType3D = 'card' | 'token'

type CardVisType2D =
  | 'card'
  | 'token'
  | 'rowDesktop'
  | 'rowMobile'
  | 'rowMini'
  | 'rowGold'
  | 'rowSilver'

export type CardVisType = CardVisType3D | CardVisType2D

export function castCardVisType(str: string): CardVisType | undefined {
  switch (str) {
    case 'card':
    case 'token':
    case 'rowDesktop':
    case 'rowMobile':
    case 'rowMini':
    case 'rowGold':
    case 'rowSilver':
      return str
    default:
      return undefined
  }
}
