import { CardPrism } from '@opensky/design-data/schema/cellTypes'

import AGY from './AGY.webp'
import ALL from './ALL.webp'
import HRT from './HRT.webp'
import INT from './INT.webp'
import STR from './STR.webp'
import UNKNOWN_CLASS from './UNKNOWN_CLASS.webp'
import WIS from './WIS.webp'

export function CardPrismRenderer({ prism }: { prism: CardPrism }) {
  const ElComponent = lookup[prism] ?? lookup.tok
  return <ElComponent height={48} />
}

const lookup: {
  [K in CardPrism]: (props: { height: number }) => JSX.Element
} = {
  agy: ({ height }) => <img src={AGY} style={{ height: `${height}px` }} />,
  hrt: ({ height }) => <img src={HRT} style={{ height: `${height}px` }} />,
  int: ({ height }) => <img src={INT} style={{ height: `${height}px` }} />,
  str: ({ height }) => <img src={STR} style={{ height: `${height}px` }} />,
  wis: ({ height }) => <img src={WIS} style={{ height: `${height}px` }} />,
  tok: ({ height }) => <img src={ALL} style={{ height: `${height}px` }} />,
  tut: ({ height }) => <img src={UNKNOWN_CLASS} style={{ height: `${height}px` }} />
}
