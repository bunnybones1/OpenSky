import { Filter, filterDisabled } from './types'

export const TextFilter: Filter<string> = {
  renderInput: ({ value, updateValue }) => (
    <input
      autoFocus
      type="text"
      className="selectedOption filterTextInput"
      value={typeof value === 'string' ? value : ''}
      onChange={(e) =>
        updateValue(e.target.value.length === 0 ? filterDisabled : e.target.value)
      }
    />
  ),
  predicate: (value, filterValue) =>
    typeof value !== 'string' ||
    value.toLowerCase().includes(filterValue.toLowerCase())
}
