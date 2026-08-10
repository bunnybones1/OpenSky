import { Filter, filterDisabled } from './types'

export const NumberFilter: Filter<number> = {
  renderInput: ({ value, updateValue }) => (
    <input
      autoFocus
      defaultValue={0}
      min={0}
      type="number"
      className={`${
        typeof value === 'number' && value >= 0 ? 'selectedOption' : ''
      } filterTextInput`}
      value={typeof value === 'number' ? value : ''}
      onChange={(e) =>
        updateValue(
          e.target.value.length === 0
            ? filterDisabled
            : Number.parseInt(e.target.value, 10)
        )
      }
    />
  ),
  predicate: (value, filterValue) =>
    typeof filterValue !== 'number' || value === filterValue
}
