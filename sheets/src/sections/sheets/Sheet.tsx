import { TabNode } from 'flexlayout-react'
import { Immutable } from 'immer'
import {
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import { Item, Menu, Separator, useContextMenu } from 'react-contexify'
import DataGrid, {
  Column,
  DataGridHandle,
  FillEvent,
  RenderHeaderCellProps,
  renderValue,
  RowsChangeData,
  SortColumn,
  textEditor
} from 'react-data-grid'
import { useSnapshot } from 'valtio'

import { filterDisabled } from '../../filters/types'
import { LayoutContext } from '../../layout'
import { sheets } from '../../sheets'
import { ColumnsWithIdAndFilter } from '../../sheets/types'
import {
  nonEditableIDKey,
  sheetsArrays,
  store,
  validationStore
} from '../../stores/designData'
import { userSettings } from '../../stores/userSettings'
import { FindByType, Writeable } from '../../types'
import { randomUUID } from '../../utils/uuid'
import { SHEET_ROW_CONTEXT_MENU_ID } from './contextMenu'
import { DraggableHeaderRenderer } from './DraggableHeaderRenderer'
import { FilterContext } from './filterContext'
import { makeHeaderCell as makeFilterRenderer } from './makeHeaderCell'
import { SearchBar } from './SearchBar'
import { setScrollTo, unsetCtrlFJustPressed } from './setSheetInstantData'

export interface SheetProps {
  sheet: keyof typeof sheets
  scrollTo?: { id: string; column?: string }
  ctrlFJustPressed: boolean
  node: TabNode
}

export function Sheet({ sheet, scrollTo, node, ctrlFJustPressed }: SheetProps) {
  const layout = useContext(LayoutContext)

  const { theme } = useSnapshot(userSettings)
  const [search, setSearch] = useState<string | null>(null)
  const [searchIsCaseSensitive, setSearchIsCaseSensitive] = useState(false)
  const [searchIndex, setSearchIndex] = useState(0)
  const searchBarRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (ctrlFJustPressed && layout?.current) {
      unsetCtrlFJustPressed(node, layout.current)
      if (search === null) {
        setSearch('')
      }
      setTimeout(() => {
        searchBarRef.current?.focus()
        searchBarRef.current?.select()
      }, 10)
    }
  }, [searchBarRef, ctrlFJustPressed, search, setSearch, layout, node])

  const dataGridHandle = useRef<DataGridHandle>(null)

  const { errors } = useSnapshot(validationStore)
  const { brainstorm } = useSnapshot(userSettings)
  const data = useSnapshot(sheetsArrays)
  const originalRows = data[sheet]
  const metadata = sheets[sheet]
  const metaCols = useMemo(
    () => (metadata?.columns as ColumnsWithIdAndFilter<object> | undefined) ?? [],
    [metadata]
  )
  const originalColumns = useMemo<ColumnsWithIdAndFilter<object>>(
    () =>
      // we need this, not sure why state snapshot rule complains here.
      // eslint-disable-next-line valtio/state-snapshot-rule
      brainstorm
        ? metaCols.map((c) => {
            const newCol = { ...c }
            if (!c.synthetic) {
              newCol.renderEditCell = textEditor
            }
            return newCol
          })
        : metaCols,
    [brainstorm, metaCols]
  )

  const filterFunctionsByColumn = useMemo(
    () => Object.fromEntries(metaCols.map((col) => [col.key, col.filter?.predicate])),
    [metaCols]
  )

  const [filters, setFilters] = useState<Record<string, any>>(() =>
    Object.fromEntries(metaCols.map((metaCol) => [metaCol.key, filterDisabled]))
  )

  const [
    primaryKeysJustCreatedAndShouldBeDisplayedRegardlessOfFilters,
    setPrimaryKeysJustCreatedAndShouldBeDisplayedRegardlessOfFilters
  ] = useState<string[]>([])

  const filteredRows = useMemo(
    () =>
      (originalRows as ReadonlyArray<{ readonly id: string }>).filter((row) => {
        if (
          primaryKeysJustCreatedAndShouldBeDisplayedRegardlessOfFilters.includes(
            row.id
          )
        ) {
          return true
        }
        for (const [columnKey, filterState] of Object.entries(filters)) {
          if (filterState === filterDisabled) {
            continue
          }
          const filterFunctionForThisKey = filterFunctionsByColumn[columnKey]

          if (!filterFunctionForThisKey) {
            continue
          }

          if (!filterFunctionForThisKey((row as any)[columnKey], filterState)) {
            return false
          }
        }
        return true
      }),
    [
      filterFunctionsByColumn,
      filters,
      originalRows,
      primaryKeysJustCreatedAndShouldBeDisplayedRegardlessOfFilters
    ]
  )

  const [columns, setColumns] = useState<ColumnsWithIdAndFilter<any>>([])

  useEffect(() => setColumns(originalColumns), [originalColumns])

  const [sortColumns, setSortColumns] = useState<readonly SortColumn[]>([])
  const onSortColumnsChange = useCallback((sortColumns: SortColumn[]) => {
    setSortColumns(sortColumns.slice(-1))
  }, [])

  const draggableColumns = useMemo(() => {
    function makeRenderHeaderCell(
      subRenderer:
        | null
        | undefined
        | ((props: RenderHeaderCellProps<any>) => ReactNode)
    ) {
      return function RenderHeaderCell(props: RenderHeaderCellProps<any>) {
        return (
          <DraggableHeaderRenderer
            {...props}
            onColumnsReorder={handleColumnsReorder}
            renderHeaderCell={subRenderer}
          />
        )
      }
    }

    function handleColumnsReorder(sourceKey: string, targetKey: string) {
      const sourceColumnIndex = columns.findIndex((c) => c.key === sourceKey)
      const targetColumnIndex = columns.findIndex((c) => c.key === targetKey)
      const reorderedColumns = [...columns]

      reorderedColumns.splice(
        targetColumnIndex,
        0,
        reorderedColumns.splice(sourceColumnIndex, 1)[0]
      )

      setColumns(reorderedColumns)
    }

    return columns.map((original) => {
      const mapped: Writeable<Column<any>> = { ...original }
      const originalHeaderRenderer = mapped.renderHeaderCell
      mapped.renderHeaderCell = makeRenderHeaderCell(
        original.filter
          ? makeFilterRenderer(original.filter, originalHeaderRenderer)
          : originalHeaderRenderer
      )
      // Primary key column needs right-click menu
      if (original.key === 'id') {
        const innerCellRender = original.renderCell ?? renderValue
        mapped.renderCell = function RenderIDCell(...props) {
          const { show } = useContextMenu({
            id: SHEET_ROW_CONTEXT_MENU_ID
          })

          return (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onContextMenu={(event) =>
                show({ event, props: { rowId: props[0].row.id } })
              }
            >
              {innerCellRender(...props)}
            </div>
          )
        }

        // Primary key column needs to be editable for re-ids.
        mapped.renderEditCell = textEditor
      }
      // Readonly mode support
      if (window.STATIC_DESIGN_DATA) {
        delete mapped.renderEditCell
      }
      return mapped
    })
  }, [columns])

  const sortedRows = useMemo((): readonly any[] => {
    if (sortColumns.length === 0) {
      return filteredRows
    }
    const { columnKey, direction } = sortColumns[0]

    const sortedRows: any[] = [...filteredRows]

    sortedRows.sort((a, b) =>
      `${a[columnKey]}`.localeCompare(`${b[columnKey]}`, 'en', { numeric: true })
    )
    return direction === 'DESC' ? sortedRows.reverse() : sortedRows
  }, [filteredRows, sortColumns])

  const onRowsChange = useCallback(
    (
      allRows: any[],
      { indexes: changedRowIndexes, column }: RowsChangeData<any, unknown>
    ) => {
      const key = column.key

      // Primary key change requires both a delete and an insert
      if (key === 'id') {
        for (const changedRowIndex of changedRowIndexes) {
          const changedRow = allRows[changedRowIndex]
          const newID = changedRow.id
          if (newID in store.value.sheets[sheet]) {
            // This is a hack to make sure the alert shows up after the cell is done editing,
            // so the Enter press that applies doesn't also close the alert.
            setTimeout(() => {
              alert(`ID ${newID} already exists in this sheet!`)
            }, 1)
            continue
          }
          const oldID = changedRow[nonEditableIDKey]
          const obj = store.value.sheets[sheet][oldID]
          delete store.value.sheets[sheet][oldID]
          store.value.sheets[sheet][newID] = obj
        }
        return
      }

      for (const changedRowIndex of changedRowIndexes) {
        const changedRow = allRows[changedRowIndex]
        const obj: Record<string, any> = store.value.sheets[sheet][changedRow.id]
        obj[key] = changedRow[key]
      }
    },
    [sheet]
  )

  useEffect(() => {
    if (!scrollTo || !dataGridHandle?.current || !layout?.current) {
      return
    }
    const numericRow = sortedRows.findIndex((r) => r.id === scrollTo.id)
    const numericColumn =
      scrollTo.column !== undefined
        ? draggableColumns.findIndex((c) => c.key === scrollTo.column)
        : undefined
    dataGridHandle.current.scrollToCell({
      idx: numericColumn,
      rowIdx: numericRow
    })
    // then clear it
    setScrollTo(node, layout.current, undefined)
  }, [scrollTo, dataGridHandle, draggableColumns, sortedRows, layout, node])

  const [newRowIDsString, setNewRowIDsString] = useState('')
  const [newRowIDsRangeStrings, setNewRowIDsRangeStrings] = useState({
    start: '',
    end: ''
  })

  const newRowIDs = useMemo(
    () =>
      newRowIDsString
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length),
    [newRowIDsString]
  )

  const searchResults = useMemo<Array<{ rowKey: string; columnKey: string }>>(() => {
    if (search === null || !search.length) {
      return []
    }
    const casedSearch = searchIsCaseSensitive ? search : search.toLowerCase()
    return sortedRows.flatMap((row) => {
      return columns
        .filter((col) => {
          const value = row[col.key]
          if (value === undefined) {
            return false
          }
          const str = typeof value === 'string' ? value : `${value}`
          return (searchIsCaseSensitive ? str : str.toLowerCase()).includes(
            casedSearch
          )
        })
        .map((col) => ({
          rowKey: row.id,
          columnKey: col.key
        }))
    })
  }, [columns, search, searchIsCaseSensitive, sortedRows])

  useEffect(() => {
    // when search index changes, scroll to that cell
    if (!layout?.current) {
      return
    }
    const currResult = searchResults[searchIndex]
    if (!currResult) {
      return
    }
    const numericRow = sortedRows.findIndex((r) => r.id === currResult.rowKey)
    const numericColumn = sortColumns.findIndex(
      (c) => c.columnKey === currResult.columnKey
    )
    dataGridHandle.current?.scrollToCell({
      idx: numericColumn === -1 ? undefined : numericColumn,
      rowIdx: numericRow
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchIndex, searchResults])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Menu id={SHEET_ROW_CONTEXT_MENU_ID} theme={theme} animation={false}>
        <Item
          onClick={({ props: { rowId } }) => {
            const lay = layout?.current
            if (!lay) return
            const dupeID = `${rowId} (${randomUUID().slice(0, 8)})`
            store.value.sheets[sheet][dupeID] = JSON.parse(
              JSON.stringify(store.value.sheets[sheet][rowId])
            )
            setScrollTo(node, lay, {
              id: dupeID
            })
          }}
        >
          Duplicate Row
        </Item>
        <Separator />
        <Item
          onClick={({ props: { rowId } }) => {
            delete store.value.sheets[sheet][rowId]
          }}
        >
          Delete Row
        </Item>
      </Menu>
      {!window.STATIC_DESIGN_DATA && (
        <div className="addRows">
          <div>
            <input
              type="text"
              placeholder="1,2,3012..."
              value={newRowIDsString}
              onChange={(e) => setNewRowIDsString(e.target.value)}
            />
            <button
              onClick={() => {
                try {
                  const lay = layout?.current
                  if (!lay) return
                  const newIDs = newRowIDs.map((id) =>
                    metadata.primaryKeySchema.parse(id)
                  )
                  for (const id of newIDs) {
                    if (!(id in store.value.sheets[sheet])) {
                      store.value.sheets[sheet][id] = metadata.newRow(id)
                    }
                    setScrollTo(node, lay, {
                      id
                    })
                  }
                  setPrimaryKeysJustCreatedAndShouldBeDisplayedRegardlessOfFilters([
                    ...primaryKeysJustCreatedAndShouldBeDisplayedRegardlessOfFilters,
                    ...newIDs
                  ])
                  setNewRowIDsString('')
                } catch (err) {
                  alert(`Error: Can't create row.\n${err}`)
                }
              }}
            >
              ➕ Add Row
              {newRowIDs.length > 1 ? 's' : ''}
            </button>
          </div>
          <div>
            <input
              type="text"
              placeholder="start"
              value={newRowIDsRangeStrings.start}
              onChange={(e) =>
                setNewRowIDsRangeStrings((x) => ({ ...x, start: e.target.value }))
              }
            />
            <input
              type="text"
              placeholder="end"
              value={newRowIDsRangeStrings.end}
              onChange={(e) =>
                setNewRowIDsRangeStrings((x) => ({ ...x, end: e.target.value }))
              }
            />
            <button
              onClick={() => {
                try {
                  const lay = layout?.current
                  if (!lay) return
                  const { start, end } = newRowIDsRangeStrings
                  const range = metadata
                    .idsFromRange(start.trim(), end.trim())
                    .map((id) => metadata.primaryKeySchema.parse(id))
                  for (const id of range) {
                    if (!(id in store.value.sheets[sheet])) {
                      store.value.sheets[sheet][id] = metadata.newRow(id)
                    }
                    setScrollTo(node, lay, {
                      id
                    })
                  }
                  setNewRowIDsRangeStrings({
                    end: '',
                    start: ''
                  })
                  setPrimaryKeysJustCreatedAndShouldBeDisplayedRegardlessOfFilters([
                    ...primaryKeysJustCreatedAndShouldBeDisplayedRegardlessOfFilters,
                    ...range
                  ])
                } catch (err) {
                  alert(`Error: Can't create row.\n${err}`)
                }
              }}
            >
              ➕ Add rows in range
            </button>
          </div>
        </div>
      )}
      <FilterContext.Provider
        value={{
          filters,
          setFilters: (newFilters) => {
            setFilters(newFilters)
            setPrimaryKeysJustCreatedAndShouldBeDisplayedRegardlessOfFilters([])
          },
          primaryKeysJustCreatedAndShouldBeDisplayedRegardlessOfFilters
        }}
      >
        <DataGrid<Immutable<object & { id: string }>>
          ref={dataGridHandle}
          className={`rdg-${theme}`}
          rowClass={useCallback(
            ({ id }: { id: string }) => {
              const invalidCells = brainstorm ? [] : errors

              const invalid = invalidCells.some(
                (c) => c.type === 'sheet' && c.sheet === sheet && c.rowId === id
              )
                ? 'error-validation'
                : ''
              const invalidColumns = invalidCells
                .filter(
                  (c): c is FindByType<typeof c, 'sheet'> =>
                    c.type === 'sheet' && c.rowId === id
                )
                .flatMap((c) => c.columns)
                .filter((x): x is string => x !== undefined)
                .map(
                  (colKey) =>
                    `err-col-${columns.findIndex((c) => c.key === colKey) + 1}`
                )
                .join(' ')

              const searchMatchColumns = searchResults
                .filter((r) => r.rowKey === id)
                .flatMap((r) => r.columnKey)
                .map(
                  (colKey) =>
                    `search-match-col-${
                      columns.findIndex((c) => c.key === colKey) + 1
                    }`
                )
                .join(' ')

              const currResult = searchResults[searchIndex]
              const currentSearchMatchColumn =
                currResult && currResult.rowKey === id
                  ? `current-search-match-col-${
                      columns.findIndex((c) => c.key === currResult.columnKey) + 1
                    }`
                  : ''
              return `${invalid} ${invalidColumns} ${searchMatchColumns} ${currentSearchMatchColumn}`
            },
            [brainstorm, columns, errors, searchIndex, searchResults, sheet]
          )}
          columns={draggableColumns}
          rows={sortedRows}
          rowKeyGetter={(r) => r.id}
          rowHeight={80}
          style={{ width: '100%', height: '100%' }}
          defaultColumnOptions={{
            sortable: true,
            resizable: true
          }}
          onRowsChange={onRowsChange}
          sortColumns={sortColumns}
          onSortColumnsChange={onSortColumnsChange}
          onFill={handleFill}
        />
        <SearchBar
          value={search}
          onChange={setSearch}
          ref={searchBarRef}
          numResults={searchResults.length}
          resultIndex={Math.min(searchIndex, searchResults.length)}
          nextResult={() => {
            setSearchIndex((i) =>
              searchResults.length === 0 ? 0 : (i + 1) % searchResults.length
            )
          }}
          prevResult={() => {
            setSearchIndex((i) =>
              searchResults.length === 0
                ? 0
                : (i - 1 + searchResults.length) % searchResults.length
            )
          }}
          isCaseSensitive={searchIsCaseSensitive}
          setIsCaseSensitive={setSearchIsCaseSensitive}
        />
      </FilterContext.Provider>
    </div>
  )
}

function handleFill({ columnKey, sourceRow, targetRow }: FillEvent<{ id: string }>): {
  id: string
} {
  return { ...targetRow, [columnKey]: sourceRow[columnKey as keyof object] }
}
