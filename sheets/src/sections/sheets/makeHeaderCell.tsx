import { ReactNode, useContext, useState } from 'react'
import { RenderHeaderCellProps } from 'react-data-grid'

import { Filter, filterDisabled } from '../../filters/types'
import { FilterContext } from './filterContext'

export function makeHeaderCell(
  { renderInput: FilterInput }: Filter<any>,
  originalHeaderRenderer:
    | null
    | undefined
    | ((props: RenderHeaderCellProps<any>) => ReactNode)
) {
  return function RenderHeaderCell(props: RenderHeaderCellProps<any>) {
    const { column, sortDirection, priority, onSort } = props
    const { filters, setFilters } = useContext(FilterContext)
    const [filterOpen, setFilterOpen] = useState(false)
    const value = column.key in filters ? filters[column.key] : filterDisabled
    const filterIsActive = value !== filterDisabled
    const showFilter = filterOpen || filterIsActive
    return (
      <div className={`header-cell ${filterIsActive ? 'filter-active' : ''}`}>
        <div>
          <button
            onClick={() => {
              if (filterOpen && filterIsActive) {
                setFilters({
                  ...filters,
                  [column.key]: filterDisabled
                })
              }
              setFilterOpen(!filterOpen)
            }}
            className={`${filterIsActive ? 'filter-active' : ''} filter-button`}
          >
            ⫧{filterIsActive ? ' x' : ''}
          </button>
          <span
            onClick={(e) => {
              onSort(e.shiftKey)
            }}
          >
            {originalHeaderRenderer ? originalHeaderRenderer(props) : column.name}{' '}
          </span>
          <span>
            {sortDirection === undefined ? null : (
              <svg
                viewBox="0 0 12 8"
                width="12"
                height="8"
                className="rdg-sort-arrow"
                aria-hidden
              >
                <path
                  d={sortDirection === 'ASC' ? 'M0 8 6 0 12 8' : 'M0 0 6 8 12 0'}
                />
              </svg>
            )}
            {priority}
          </span>
        </div>

        {showFilter && (
          <div className="filter">
            <FilterInput
              value={value}
              updateValue={(newVal) => {
                setFilters({
                  ...filters,
                  [column.key]: newVal
                })
              }}
            />
          </div>
        )}
      </div>
    )
  }
}
