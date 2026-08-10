import { Filter, filterDisabled } from './types'

export const TextFilterWithEmptyOption: Filter<string> = {
  renderInput: ({ value, updateValue }) => (
    <>
      <button
        className={value === '' ? 'selectedOption' : ''}
        onClick={() => updateValue('')}
      >
        No Text
      </button>
      <input
        autoFocus
        type="text"
        className={`${
          typeof value === 'string' && value.length ? 'selectedOption' : ''
        } filterTextInput`}
        value={typeof value === 'string' ? value : ''}
        onChange={(e) =>
          updateValue(e.target.value.length === 0 ? filterDisabled : e.target.value)
        }
      />
    </>
  ),
  predicate: (value, filterValue) =>
    typeof value !== 'string' ||
    (filterValue === ''
      ? value === undefined || value === ''
      : value.toLowerCase().includes(filterValue.toLowerCase()))
}
