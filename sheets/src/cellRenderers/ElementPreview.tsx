import { cardElement } from '@opensky/design-data/schema/cellTypes'
import { ValidationError } from 'myzod'

import { CardElement } from './element/CardElement'
import { RCProps } from './utils'

export function ElementPreview({ row, column }: RCProps) {
  const value = row[column.key]
  const element = cardElement.try(value)
  if (element instanceof ValidationError) {
    return <div>{`${value}`}</div>
  }
  return (
    <div className="full-cell">
      <CardElement element={element as 'sky'} />
      <div className="bottomBadge">{element}</div>
    </div>
  )
}
