import { cardPrism } from '@opensky/design-data/schema/cellTypes'
import { ValidationError } from 'myzod'

import { CardPrismRenderer } from './prism/CardPrism'
import { RCProps } from './utils'

export function PrismPreview({ row, column }: RCProps) {
  const value = row[column.key]
  const prism = cardPrism.try(value)
  if (prism instanceof ValidationError) {
    return <div>{`${value}`}</div>
  }
  return (
    <div className="full-cell">
      <CardPrismRenderer prism={prism} />
      <div className="bottomBadge">{prism}</div>
    </div>
  )
}
