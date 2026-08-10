// import './search.css'

// import { sheetRowKeys, SheetsDataType } from '@opensky/design-data/schema'
// import Fuse from 'fuse.js'
// import { useMemo, useState } from 'react'
// import { CalculatedColumn, renderValue, Row } from 'react-data-grid'
// import { useKey } from 'react-use'
// import { subscribe } from 'valtio'

// import { sheets } from '../sheets'
// import { sheetsDerivedDataStore } from '../stores/designData'

// const fuse = new Fuse(sheetsDerivedDataStore.flattenedRows, {
//   keys: sheetRowKeys,
//   minMatchCharLength: 2
// })

// subscribe(sheetsDerivedDataStore, () => {
//   fuse.setCollection(sheetsDerivedDataStore.flattenedRows)
// })

// type AnyRow = SheetsDataType[keyof SheetsDataType][string]

// export function GlobalSearch() {
//   const [open, setOpen] = useState(false)
//   const [search, setSearch] = useState('')

//   // search for any text in the entire sheet, and show those results ranked
//   // by the index of the key in the object's .keys iter.

//   const results = useMemo(
//     () =>
//       fuse.search(search, {
//         limit: 10
//       }),
//     [search]
//   )

//   // when you hit ctrl-k, open the modal
//   // when you hit esc, close the modal

//   // useKey(
//   //   'k',
//   //   () => {
//   //     if (!open) {
//   //       setOpen(true)
//   //       setSearch('')
//   //     }
//   //   },
//   //   undefined,
//   //   [open, setOpen, setSearch]
//   // )

//   useKey(
//     'Escape',
//     () => {
//       setOpen(false)
//     },
//     undefined,
//     [setOpen]
//   )

//   return open ? (
//     <div className="global-search-modal">
//       <div className="global-search-input">
//         <input
//           type="text"
//           onChange={(e) => {
//             setSearch(e.target.value)
//           }}
//           value={search}
//           autoFocus
//         />
//       </div>
//       <div className="rdg global-search-results">
//         {results.map((row) => {
//           const columns: ReadonlyArray<CalculatedColumn<AnyRow, any>> = sheets[
//             row.item.sheetName
//           ].columns.map((c, idx) => ({
//             ...c,
//             idx,
//             isLastFrozenColumn: false,
//             rowGroup: false,
//             minWidth: c.minWidth ?? 50,
//             maxWidth: c.maxWidth ?? undefined,
//             width: c.width ?? 'auto',
//             resizable: false,
//             sortable: false,
//             frozen: false,
//             renderCell: c.renderCell ?? renderValue
//           }))

//           return (
//             <Row<AnyRow, any>
//               key={row.item.sheetName + row.item.id}
//               rowIdx={0}
//               row={row.item}
//               viewportColumns={columns}
//               selectedCellIdx={undefined}
//               draggedOverCellIdx={undefined}
//               copiedCellIdx={undefined}
//               lastFrozenColumnIndex={0}
//               isRowSelected={false}
//               gridRowStart={0}
//               height={40}
//               selectedCellEditor={undefined}
//               selectedCellDragHandle={undefined}
//               onRowChange={() => {}}
//               rowClass={() => ''}
//               setDraggedOverRowIdx={() => {}}
//               selectCell={() => {}}
//             />
//           )
//         })}
//       </div>
//     </div>
//   ) : null
// }
