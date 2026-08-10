import SelectSearch from 'react-select-search'
import { useSnapshot } from 'valtio'

import { sheetsArrays } from '../stores/designData'
import { RCEditProps } from './utils'

export function BackgroundEditor({ row, onRowChange }: RCEditProps) {
  const cards = useSnapshot(sheetsArrays.art)
  return (
    <div className="select-on-top">
      <SelectSearch
        autoFocus
        autoComplete="on"
        search
        fuzzySearch
        options={[
          { name: 'No Background', value: 'undefined' },
          ...cards
            .filter((c) => c.id.startsWith('bg-'))
            .map((c) => ({ name: c.id, value: c.id }))
        ]}
        value={`${row.bgId}`}
        onChange={(bgId) => {
          onRowChange({
            ...row,
            bgId: bgId === 'undefined' ? undefined : (bgId as string)
          })
        }}
      />
    </div>
  )
}
