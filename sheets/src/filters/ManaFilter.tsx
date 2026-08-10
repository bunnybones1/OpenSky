import { CardManaCost } from '@opensky/design-data/schema/cellTypes'

import { ManaCrystalEditor } from '../cellRenderers/ManaCrystalEditor'
import { Filter, filterDisabled } from './types'

export const ManaFilter: Filter<CardManaCost> = {
  renderInput: ({ value, updateValue }) => (
    <ManaCrystalEditor
      column={{
        key: 'cost'
      }}
      row={{ cost: value }}
      onRowChange={({ cost }) =>
        updateValue(
          (typeof cost === 'string' || typeof cost === 'number') &&
            (cost === 'no' ||
              cost === 'X' ||
              (typeof cost === 'number' && !Number.isNaN(cost)))
            ? cost
            : filterDisabled
        )
      }
      onClose={() => {}}
    />
  ),
  predicate: (value, filterValue) => value === filterValue
}
