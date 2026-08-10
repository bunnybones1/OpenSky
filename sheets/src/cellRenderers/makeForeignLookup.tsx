import { RenderCellProps } from 'react-data-grid'
import { useSnapshot } from 'valtio'

import { store } from '../stores/designData'

export function makeForeignLookup<
  T extends object,
  K extends keyof typeof store.value.sheets
>(
  id: (row: T) => string,
  sheet: K,
  render: (row: (typeof store.value.sheets)[K][string]) => JSX.Element
) {
  return function ForeignLookup({ row }: RenderCellProps<T>) {
    const sheets = useSnapshot(store).value.sheets
    const lookupSheet = sheets[sheet]
    const lookupId = id(row)
    const foreignRow = lookupSheet[lookupId]
    if (!foreignRow) {
      return (
        <div className="full-cell" style={{ color: 'red' }}>
          #REF
        </div>
      )
    }
    return render(foreignRow as any)
  }
}
