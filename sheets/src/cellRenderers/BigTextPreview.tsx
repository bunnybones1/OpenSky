import { RCProps } from './utils'

export function BigTextPreview({ row, column }: RCProps) {
  return <div className="full-cell big-text">{`${row[column.key]}`}</div>
}
