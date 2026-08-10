import { KeysOfUnion, SheetsDataType } from '@opensky/design-data/schema'
import { useMemo, useState } from 'react'
import SelectSearch from 'react-select-search'
import { useSnapshot } from 'valtio'

import {
  SetsOfValuesForEachSheetColumn,
  sheetsDerivedDataStore
} from '../stores/designData'
import { Filter, filterDisabled } from './types'

export function makeMultiDropdownFilter<T extends keyof SheetsDataType>(
  sheet: T,
  column: KeysOfUnion<SheetsDataType[T][string]>,
  valueNameMapper?: (value: string) => string
): Filter<{ type: 'and' | 'or'; values: Array<string> }> {
  return {
    renderInput: function MultiDropdownFilter({ value, updateValue }) {
      const valuesSet = (
        useSnapshot(sheetsDerivedDataStore)
          .setOfValuesPerSheetColumn as SetsOfValuesForEachSheetColumn
      )[sheet][column]

      const valuesArray = useMemo(() => [...valuesSet], [valuesSet])

      const options = useMemo(
        () =>
          valuesArray.map((v) => {
            const stringVal = `${v}`
            return {
              name: valueNameMapper ? valueNameMapper(stringVal) : stringVal,
              value: stringVal
            }
          }),
        [valuesArray]
      )

      const [dropdownOpen, setDropdownOpen] = useState(true)
      return (
        <div
          className="dropdown-filter"
          onBlur={() => {
            setDropdownOpen(false)
          }}
        >
          <div>
            <input
              type="radio"
              name="filterMode"
              checked={value !== filterDisabled && value.type === 'and'}
              onChange={() =>
                updateValue({
                  type: 'and',
                  values: value === filterDisabled ? [] : value.values
                })
              }
            />
            and
          </div>
          <div>
            <input
              type="radio"
              name="filterMode"
              checked={value !== filterDisabled && value.type === 'or'}
              onChange={() =>
                updateValue({
                  type: 'or',
                  values: value === filterDisabled ? [] : value.values
                })
              }
            />
            or
          </div>
          <button
            onClick={() => {
              setDropdownOpen(!dropdownOpen)
            }}
          >
            {value === filterDisabled ? '' : `[${value.values.join(', ')}]`}⏷
          </button>

          {dropdownOpen && (
            <SelectSearch
              search
              fuzzySearch
              multiple
              options={options}
              value={value === filterDisabled ? [] : value.values}
              onChange={(val) => {
                if (!Array.isArray(val)) {
                  throw new Error()
                }
                if (!val) {
                  updateValue(filterDisabled)
                  return
                }
                updateValue({
                  type: value === filterDisabled ? 'or' : value.type,
                  values: val as string[]
                })
              }}
            />
          )}
        </div>
      )
    },
    predicate: (value, filterValue) => {
      if (!Array.isArray(value)) {
        console.error('expected array value', value)
        return false
      }

      if (filterValue.values.length === 0) {
        return value.length === 0
      }

      if (filterValue.type === 'and') {
        return filterValue.values.every((v) => value.includes(v))
      } else if (filterValue.type === 'or') {
        return filterValue.values.some((v) => value.includes(v))
      } else {
        const _exhaustiveCheck: never = filterValue.type
        return _exhaustiveCheck
      }
    }
  }
}
