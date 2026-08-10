import {
  renderHeaderCell as defaultRenderHeaderCell,
  type RenderHeaderCellProps
} from 'react-data-grid'
import { useDrag, useDrop } from 'react-dnd'

interface DraggableHeaderRendererProps<R> extends RenderHeaderCellProps<R> {
  onColumnsReorder: (sourceKey: string, targetKey: string) => void
  renderHeaderCell: typeof defaultRenderHeaderCell | null | undefined
}

export function DraggableHeaderRenderer<R>({
  onColumnsReorder,
  column,
  renderHeaderCell,
  ...props
}: DraggableHeaderRendererProps<R>) {
  const [{ isDragging }, drag] = useDrag({
    type: 'COLUMN_DRAG',
    item: { key: column.key },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  })

  const [{ isOver }, drop] = useDrop({
    accept: 'COLUMN_DRAG',
    drop({ key }: { key: string }) {
      onColumnsReorder(key, column.key)
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop()
    })
  })

  const HeaderCellRenderer = renderHeaderCell ?? defaultRenderHeaderCell

  return (
    <div
      className="draggable-header"
      ref={(ref) => {
        drag(ref)
        drop(ref)
      }}
      style={{
        opacity: isDragging ? 0.5 : 1,
        backgroundColor: isOver ? '#ececec' : undefined
      }}
    >
      <HeaderCellRenderer {...props} column={column} />
    </div>
  )
}
