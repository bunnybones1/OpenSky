import { RenderEditCellProps } from 'react-data-grid'

export function makeNumberEditor(min: number, max: number) {
  return function NumberEditor({
    row,
    column,
    onRowChange,
    onClose
  }: RenderEditCellProps<any>) {
    const key = column.key as keyof typeof row
    const val = row[key]

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          gap: '4px'
        }}
      >
        <input
          style={{
            height: '100%'
          }}
          autoFocus
          type="number"
          min={min}
          max={max}
          value={val ?? ''}
          onChange={(e) => {
            onRowChange({
              ...row,
              [key]:
                e.target.value.trim().length === 0
                  ? undefined
                  : Number.parseInt(e.target.value.trim(), 10)
            })
          }}
          onBlur={() => {
            onClose(true, false)
          }}
        />
      </div>
    )
  }
}
