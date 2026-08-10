import SelectSearch from 'react-select-search'
import { useSnapshot } from 'valtio'

import { sheetsArrays } from '../stores/designData'
import { RCEditProps } from './utils'

export function AttachmentEditor({ row, onRowChange }: RCEditProps) {
  const cards = useSnapshot(sheetsArrays.cards)
  return (
    <div className="select-on-top">
      <SelectSearch
        autoFocus
        autoComplete="on"
        search
        fuzzySearch
        options={[
          { name: 'No Attachment', value: 'undefined' },
          ...cards
            .filter((c) => c.type === 'enchant' || c.type === 'spell')
            .map((c) => ({ name: c.name, value: c.id }))
        ]}
        value={`${row.attachment}`}
        onChange={(attach) => {
          onRowChange({
            ...row,
            attachment: attach === 'undefined' ? undefined : (attach as string)
          })
        }}
      />
    </div>
  )
}
