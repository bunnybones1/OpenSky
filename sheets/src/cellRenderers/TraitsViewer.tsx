import { cardTraits } from '@opensky/design-data/schema/cellTypes'
import { ValidationError } from 'myzod'

import { RCProps } from './utils'

export function TraitsViewer({ row, column }: RCProps) {
  const value = row[column.key]
  const traits = cardTraits.try(value)
  if (traits instanceof ValidationError) {
    return <div>{`${value}`}</div>
  }
  return (
    <div
      style={{
        ...(traits.length ? { background: 'rgba(255, 200, 112, 0.2)' } : {}),
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {traits.map((trait) => (
        <div
          key={trait}
          style={{
            whiteSpace: 'nowrap',
            lineHeight: '1.5em'
          }}
        >
          <div>
            {/* type={`trait-${trait}`} */}
            {/* height={'10px'} */}
            {/* style={{ display: 'inline-flex' }} */}
          </div>
          {trait}
        </div>
      ))}
    </div>
  )
}
