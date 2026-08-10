import { RCProps } from './utils'

export function ColorPreview({ row, column }: RCProps) {
  const key = column.key as keyof typeof row
  const value = row[key]
  return (
    <div
      style={{
        background: `${value}`,
        color: 'black'
      }}
    >
      {`${value}`}
    </div>
  )
}
