import { CardType } from '@opensky/design-data/schema/cellTypes'
import { RenderCellProps } from 'react-data-grid'

import { CARD_TYPE_COLORS } from '../assets/metadata'

export function TypePreview({ row, column }: RenderCellProps<any>) {
  const type = row[column.key as keyof typeof row] as CardType

  return (
    <div className="full-cell" style={{ background: CARD_TYPE_COLORS[type] }}>
      {type}
    </div>
  )
}
