import { RCEditProps } from './utils'

export function ManaCrystalEditor({ row, onRowChange }: RCEditProps) {
  const isNumericalCost = typeof row.cost === 'number'
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        whiteSpace: 'normal',
        lineHeight: 1
      }}
    >
      <input
        autoFocus
        type="number"
        min={0}
        max={99}
        value={typeof row.cost === 'number' ? row.cost : ''}
        onChange={(e) => {
          onRowChange({ ...row, cost: Number.parseInt(e.target.value, 10) })
        }}
        className={isNumericalCost && !Number.isNaN(row.cost) ? 'selectedOption' : ''}
      />
      <button
        className={row.cost === 'X' ? 'selectedOption' : ''}
        onClick={() => onRowChange({ ...row, cost: 'X' })}
      >
        X
      </button>
      <button
        className={row.cost === 'no' ? 'selectedOption' : ''}
        onClick={() => onRowChange({ ...row, cost: 'no' })}
      >
        no
      </button>
    </div>
  )
}
