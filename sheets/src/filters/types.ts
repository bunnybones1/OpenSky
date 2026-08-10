export interface Filter<T> {
  /**
   *
   * @param value The value in the cell. Can be any type.
   * @param filterValue The value saved in the filter UI. Includes on/off state.
   * @returns true if the filter isn't active, or if the value passes the filter.
   */
  predicate: (value: any, filterValue: T) => boolean
  renderInput: (props: {
    value: T | FilterDisabed
    updateValue: (newValue: T | FilterDisabed) => void
  }) => JSX.Element
}
export const filterDisabled = Symbol('filterDisabled')
export type FilterDisabed = typeof filterDisabled
