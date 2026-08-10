import { Immutable } from 'immer'
import { Infer, Type } from 'myzod'
import { Column } from 'react-data-grid'

import { Filter } from '../filters/types'
import { sheetsArrays } from '../stores/designData'

/**
 * A description of the columns of a sheet for a given type.
 */
export type ColumnsWithIdAndFilter<T extends object> = T extends { id: any }
  ? never
  : Immutable<
      Array<
        (
          | { synthetic: true; key: string }
          | {
              synthetic?: never
              key: FilterExtending<keyof T | 'id', string>
            }
        ) &
          Omit<
            Column<
              T & {
                id: string
              }
            >,
            | 'key'
            | 'renderHeaderCell'
            // ID cells always get the default editor
            | (T extends { id: any } ? 'renderEditCell' : never)
          > & {
            filter?: Filter<any>
          }
      >
    >

// TODO make this type-safe for sheetArray as well
export interface SheetDescription<K extends Type<string>, V extends object> {
  name: string
  columns: ColumnsWithIdAndFilter<V>
  sheetArray: keyof typeof sheetsArrays
  // TODO find a way to make this type-safe, instead of passing in anything here.
  primaryKeySchema: K
  newRow: (id: Infer<K>) => V
  idsFromRange: (start: Infer<K>, end: Infer<K>) => Array<Infer<K>>
}

type FilterExtending<K, F> = K extends F ? K : never
