import { CardElement as CardElementType } from '@opensky/design-data/schema/cellTypes'

import { ElementAir } from './ElementAir'
import { ElementDark } from './ElementDark'
import { ElementEarth } from './ElementEarth'
import { ElementFire } from './ElementFire'
import { ElementLight } from './ElementLight'
import { ElementMetal } from './ElementMetal'
import { ElementMind } from './ElementMind'
import { ElementWater } from './ElementWater'
import { HeightOnly } from './SVG'

export function CardElement({ element }: { element: CardElementType }) {
  const ElComponent = lookup[element] ?? lookup.sky
  return <ElComponent height={48} />
}

const lookup: {
  [key in CardElementType]: (props: HeightOnly) => JSX.Element
} = {
  air: ElementAir,
  earth: ElementEarth,
  fire: ElementFire,
  water: ElementWater,
  light: ElementLight,
  dark: ElementDark,
  metal: ElementMetal,
  mind: ElementMind,
  sky: () => <div></div>
}
