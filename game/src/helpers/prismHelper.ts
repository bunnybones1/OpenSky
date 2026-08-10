import { PrismClass } from '@opensky/shared/constants'
import { Prism } from '@skyweaver/state-metadata'

export function prismToPrismClass(prism: Prism): PrismClass | undefined {
  switch (prism) {
    case 'agy':
      return PrismClass.AGY
    case 'hrt':
      return PrismClass.HRT
    case 'int':
      return PrismClass.INT
    case 'str':
      return PrismClass.STR
    case 'wis':
      return PrismClass.WIS
    case 'tok':
      return
    case 'tut':
      return
  }
}
