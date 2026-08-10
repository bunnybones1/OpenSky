import { Card } from '@opensky/design-data/schema'
import { Immutable } from 'immer'
import { RenderCellProps } from 'react-data-grid'

import { CARD_TYPE_COLORS } from '../assets/metadata'

export function CardNamePreview({ row }: RenderCellProps<Immutable<Card>>) {
  return (
    <div
      style={{
        width: '100%',
        paddingLeft: '8px',
        fontStyle: 'italic',
        background: CARD_TYPE_COLORS[row.type]
      }}
    >
      {row.name}
    </div>
  )
}
