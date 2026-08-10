import { cardManaCost } from '@opensky/design-data/schema/cellTypes'
import { ValidationError } from 'myzod'

import { GradientValue } from './GradientValue'
import { RCProps } from './utils'

const MIN_COLOR = [201, 218, 248] as const
const MAX_COLOR = [17, 85, 204] as const

export function ManaCrystalPreview({ row, column }: RCProps) {
  const value = row[column.key]
  const mana = cardManaCost.try(value)
  if (mana instanceof ValidationError) {
    return <div>{`${value}`}</div>
  }
  return (
    <div className="full-cell">
      <GradientValue
        value={typeof mana === 'number' ? mana : 10}
        maxValue={10}
        minColor={MIN_COLOR}
        maxColor={MAX_COLOR}
      >
        {mana}
      </GradientValue>
    </div>
  )
}
