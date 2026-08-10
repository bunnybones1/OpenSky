import { KeysOfUnion, SheetsDataType } from '@opensky/design-data/schema'
import { useMemo, useState } from 'react'
import SelectSearch from 'react-select-search'
import { useSnapshot } from 'valtio'

import {
  SetsOfValuesForEachSheetColumn,
  sheetsDerivedDataStore
} from '../stores/designData'
import { Filter, filterDisabled } from './types'

export function makeSingleDropdownFilter<T extends keyof SheetsDataType>(
  sheet: T,
  column: KeysOfUnion<SheetsDataType[T][string]>,
  valueNameMapper?: (value: string) => string
): Filter<Array<string>> {
  return {
    renderInput: function SingleDropdownFilter({ value, updateValue }) {
      const valuesSet = (
        useSnapshot(sheetsDerivedDataStore)
          .setOfValuesPerSheetColumn as SetsOfValuesForEachSheetColumn
      )[sheet][column]

      const valuesArray = useMemo(
        () => (valuesSet?.size ? [...valuesSet] : []),
        [valuesSet]
      )

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
          <button
            onClick={() => {
              setDropdownOpen(!dropdownOpen)
            }}
          >
            {value === filterDisabled ? '' : `[${value.join(', ')}]`}⏷
          </button>

          {dropdownOpen && (
            <SelectSearch
              search
              fuzzySearch
              multiple
              options={options}
              value={value === filterDisabled ? [] : value}
              onChange={(val) => {
                if (!Array.isArray(val)) {
                  throw new Error()
                }
                if (!val || (Array.isArray(val) && !val.length)) {
                  updateValue(filterDisabled)
                  return
                }
                updateValue(val as string[])
              }}
            />
          )}
        </div>
      )
    },
    predicate: (value, filterValue) => filterValue.some((v) => value === v)
  }
}
