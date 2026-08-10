import { RCProps } from './utils'

export function BooleanPreview({ row, column, onRowChange }: RCProps) {
  const value = row[column.key]
  if (typeof value !== 'boolean') {
    return <div>{`${value}`}</div>
  }
  return (
    <div className="full-cell">
      <input
        type="checkbox"
        checked={value}
        disabled={!onRowChange}
        onChange={(e) => {
          onRowChange?.({ ...row, [column.key]: e.target.checked })
        }}
      />
    </div>
  )
}
