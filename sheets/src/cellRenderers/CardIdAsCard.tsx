import { useSnapshot } from 'valtio'

import { sheetsDerivedDataStore } from '../stores/designData'
import { ArtSlugPreview } from './ArtSlugPreview'
import { RCProps } from './utils'

export function CardIdAsCard({ row, column }: RCProps) {
  const { getCard } = useSnapshot(sheetsDerivedDataStore)

  const val = row[column.key]
  if (typeof val !== 'string') {
    return `${val}`
  }

  const card = getCard(val)

  return (
    <ArtSlugPreview
      column={{
        key: 'artSlug'
      }}
      row={card}
      overrideText={card.name}
    />
  )
}
