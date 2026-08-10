import { GradientValue } from './GradientValue'
import { RCProps } from './utils'

export function makeGradientValue(
  maxValue: number,
  minColor: readonly [number, number, number],
  maxColor: readonly [number, number, number]
) {
  return function FixedGradientValue({ column, row }: RCProps) {
    const value = row[column.key]

    if (value === undefined) return null
    if (typeof value !== 'number') return `${value}`

    return (
      <GradientValue
        value={value}
        maxValue={maxValue}
        minColor={minColor}
        maxColor={maxColor}
      >
        {value}
      </GradientValue>
    )
  }
}
