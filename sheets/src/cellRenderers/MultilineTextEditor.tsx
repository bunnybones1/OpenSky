import { RCEditProps } from './utils'

function autoFocusAndSelect(input: HTMLTextAreaElement | null) {
  input?.focus()
  input?.select()
}

export default function MultilineTextEditor({
  row,
  column,
  onRowChange,
  onClose
}: RCEditProps) {
  return (
    <textarea
      className={`rdg-text-editor multiline-text-editor`}
      ref={autoFocusAndSelect}
      value={
        typeof row[column.key] === 'string'
          ? (row[column.key] as string)
          : `${row[column.key]}`
      }
      onChange={(event) => onRowChange({ ...row, [column.key]: event.target.value })}
      onBlur={() => onClose(true, false)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          if (!(e.ctrlKey || e.shiftKey)) {
            onClose(true, false)
          } else {
            e.stopPropagation()
          }
        }
      }}
    />
  )
}
