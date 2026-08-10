import { Filter, filterDisabled } from './types'

export const NumberFilterWithEmptyOption: Filter<string> = {
  renderInput: ({ value, updateValue }) => (
    <>
      <button
        className={value === '' ? 'selectedOption' : ''}
        onClick={() => updateValue('')}
      >
        No Value
      </button>
      <input
        autoFocus
        type="number"
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
    typeof filterValue !== 'string' ||
    (filterValue === ''
      ? value === undefined
      : value === Number.parseInt(filterValue, 10))
}
