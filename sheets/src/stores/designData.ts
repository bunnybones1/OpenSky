import {
  GlobalDataSchema,
  GlobalDataType,
  SheetsDataType
} from '@opensky/design-data/schema'
import { invoke } from '@tauri-apps/api'
import { ValidationError } from 'myzod'
import { proxy, subscribe } from 'valtio'
import { derive } from 'valtio/utils'

export const store = proxy<{ value: GlobalDataType }>({
  value: {
    assetsHash: '',
    sheets: {
      cards: {},
      art: {},
      vocab: {},
      quests: {},
      crystals: {},
      heroSkins: {},
      cardBacks: {}
    }
  }
})

let updates_disabled = false

export function disableUpdatesWhileClosureRuns(closure: () => void) {
  updates_disabled = true
  closure()
  updates_disabled = false
}

if (window.STATIC_DESIGN_DATA) {
  store.value = window.STATIC_DESIGN_DATA
} else {
  invoke('get_database').then((db: GlobalDataType) => {
    store.value = db
    subscribe(
      store,
      (ops) => {
        if (updates_disabled) return
        invoke('update_paths', {
          paths: ops.map(([type, path, value]) => ({
            path: `/${path.slice(1).join('/')}`,
            value: type === 'delete' ? undefined : value
          }))
        })
      },
      true
    )
  })
}

// listen('tauri://menu', (e) => {
//   if (e.payload === 'undo') {
//     store.undo()
//   } else if (e.payload === 'redo') {
//     store.redo()
//   }
// })

interface StringyError {
  path: string[]
  columns: string[]
  error: ValidationError
}

type DataValidationError = { message: string } & (
  | {
      type: 'sheet'
      sheet: string
      rowId: string
      columns: string[]
    }
  | {
      type: 'global'
    }
)

type FlattenedSheetRows = {
  [K in keyof SheetsDataType]: {
    id: string
    sheetName: K
  } & SheetsDataType[K][keyof SheetsDataType[K]]
}[keyof SheetsDataType]

export type SetsOfValuesForEachSheetColumn = {
  [S in keyof SheetsDataType]: {
    [K in keyof SheetsDataType[S][string]]: Set<SheetsDataType[S][string][K]>
  }
}

export const sheetsDerivedDataStore = derive({
  getCard(get) {
    return (c: string) => get(store).value.sheets.cards[c]
  },

  flattenedRows(get): Array<FlattenedSheetRows> {
    const sheets = get(store).value.sheets
    return Object.entries(sheets).flatMap(([sheetName, sheet]) =>
      Object.entries(sheet).map(([id, row]) => ({
        id,
        sheetName,
        ...row
      }))
    )
  },
  setOfValuesPerSheetColumn(get): SetsOfValuesForEachSheetColumn {
    const sheets = get(store).value.sheets
    const res = {} as SetsOfValuesForEachSheetColumn
    for (const [sheetName, sheet] of Object.entries(sheets)) {
      const thisSheetRes: Record<string, Set<any>> = {}
      res[sheetName as keyof SheetsDataType] = thisSheetRes as any
      for (const rowValues of Object.values(sheet) as Array<(typeof sheet)[string]>) {
        for (const [key, value] of Object.entries(rowValues)) {
          if (!thisSheetRes[key]) {
            thisSheetRes[key] = new Set()
          }
          // For arrays, we only want to track unique values inside arrays.
          if (Array.isArray(value)) {
            for (const v of value) {
              thisSheetRes[key].add(v)
            }
          } else {
            thisSheetRes[key].add(value)
          }
        }
      }
    }
    return res
  }
})

export const validationStore = proxy<{
  errors: DataValidationError[]
  needsUpdate: boolean
}>({
  errors: [],
  needsUpdate: false
})

subscribe(store, () => {
  validationStore.needsUpdate = true
  requestIdleCallback(
    () => {
      if (!validationStore.needsUpdate) return
      validationStore.needsUpdate = false

      const res = GlobalDataSchema.try(store.value)
      if (!(res instanceof ValidationError)) {
        validationStore.errors = []
        return
      }

      const errs = flattenErrsIntoStrings(res).map<DataValidationError>((err) => {
        const [sheets, sheet, rowId] = err.path
        const columns = err.columns
        if (sheets !== 'sheets') {
          return {
            type: 'global',
            message: JSON.stringify(err)
          }
        }
        return {
          type: 'sheet',
          message: err.error.message,
          sheet,
          rowId,
          columns
        }
      })
      validationStore.errors = errs
    },
    {
      timeout: 10_000
    }
  )
})

const sheetsKeys = Object.keys(store.value.sheets) as Array<
  keyof GlobalDataType['sheets']
>

export const nonEditableIDKey = Symbol('a non-editable version of the ID.')
export const sheetsArrays: {
  [K in keyof GlobalDataType['sheets']]: Array<
    GlobalDataType['sheets'][K][keyof GlobalDataType['sheets'][K]] & {
      id: string
    }
  >
} = derive(
  sheetsKeys.reduce(
    (acc, sheetName) => {
      acc[sheetName as keyof typeof store.value.sheets] = (get) => {
        return Object.entries(get(store).value.sheets[sheetName]).map(
          ([id, card]) => ({
            id,
            [nonEditableIDKey]: id,
            ...card
          })
        )
      }
      return acc
    },
    {} as {
      [K in keyof GlobalDataType['sheets']]: (
        get: (s: typeof store) => typeof store
      ) => Array<
        GlobalDataType['sheets'][K][keyof GlobalDataType['sheets'][K]] & {
          id: string
        }
      >
    }
  )
)

export type SheetsArrays = typeof sheetsArrays

function flattenErrsIntoStrings(
  error: ValidationError,
  path: string[] = []
): Array<StringyError> {
  const res: Array<StringyError> = []
  if (error.collectedErrors) {
    const collectedErrors = Object.values(error.collectedErrors)
    if (collectedErrors.length) {
      for (const e of collectedErrors) {
        if (e) {
          res.push(
            ...flattenErrsIntoStrings(e, [
              ...path,
              ...(e.path ? (e.path as string[]) : [])
            ])
          )
        }
      }
      return res
    }
  }
  res.push({ path, error, columns: error?.path?.slice(1).map(String) ?? [] })
  return res
}
