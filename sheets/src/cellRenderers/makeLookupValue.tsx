import { RCProps } from './utils'

export function makeLookupValue<T extends string>(colorLookup: {
  [key in T]: string
}) {
  return function FixedGradientValue({ column, row }: RCProps) {
    const value = row[column.key]

    if (value === undefined) return null

    return (
      <div
        style={{
          background: colorLookup[value as T]
        }}
        className="full-cell"
      >
        {`${value}`}
      </div>
    )
  }
}
