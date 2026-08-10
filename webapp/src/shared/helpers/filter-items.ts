type Filters<T> = {
  [K in keyof T]: T[K]
}

export type Criteria<T, U> = {
  [K in keyof U]: {
    isApplied: (value: U[K]) => boolean
    isFiltered: (item: T, value: U[K]) => boolean
  }
}

interface FilterItemsParams<T, U> {
  items: T[]
  filters: Filters<U>
  criteria: Criteria<T, U>
}

/**
 *
 * Filters an array of items based on passed in filter values,
 * and criteria. Filters are applied in the order they appear in the
 * filters object. So its better to put more intensive filter logic last
 * so it can iterate on smaller sets of data, and filter logic that most reduces
 * the size of that set first.
 */
export const filterItems = <Item, Filters>({
  items,
  filters,
  criteria
}: FilterItemsParams<Item, Filters>) => {
  const filterKeys = Object.keys(filters) as (keyof typeof filters)[]

  let filteredItems = items

  filterKeys.forEach((key) => {
    const value = filters[key]
    const filterCriteria = criteria[key]

    if (filterCriteria.isApplied(value)) {
      filteredItems = filteredItems.filter((item) =>
        filterCriteria.isFiltered(item, value)
      )
    }
  })

  return filteredItems
}
