import { useSnapshot } from 'valtio'

import { useGetAsset } from '../assets/useGetAsset'
import { store } from '../stores/designData'
import { RCProps } from './utils'

export function AttachmentPreview({ row, column }: RCProps) {
  const cards = useSnapshot(store).value.sheets.cards
  const { getAssetUrl } = useGetAsset()
  const value = row[column.key]
  if (!value) return null
  if (typeof value !== 'number') return <div>{`${value}`}</div>

  const referencedAttach = cards[value]

  return (
    <div className="full-cell">
      <img
        src={getAssetUrl?.(
          `rawPreviews/cards/art-full/spells/${referencedAttach?.artSlug}.jpeg`
        )}
        style={{ height: '100%', borderRadius: '999px' }}
      />
      <div className="bottomBadge">{referencedAttach?.name}</div>
    </div>
  )
}
