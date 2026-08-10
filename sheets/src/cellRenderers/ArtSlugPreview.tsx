import { Artist, ArtKind } from '@opensky/design-data/schema/options'
import { useSnapshot } from 'valtio'

import { useGetAsset } from '../assets/useGetAsset'
import { store } from '../stores/designData'
import { RCProps } from './utils'

export function ArtSlugPreview({
  row,
  column,
  overrideText
}: RCProps & { overrideText?: string }) {
  const {
    value: { sheets }
  } = useSnapshot(store)
  // console.log(sheets)
  const { getAssetUrl } = useGetAsset()

  const value = row[column.key] as string
  if (!value) return null
  if (typeof value !== 'string') return <div>`${value}`</div>

  const bgRef = sheets.art[value]?.bgId
  const artURL = getArtURL(value)
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        ...(bgRef
          ? {
              background: `url(${getAssetUrl?.(
                `/rawPreviews/cards/art-full/bgs/${bgRef}.jpeg`
              )})`
            }
          : {}),
        position: 'relative'
      }}
    >
      <img src={getAssetUrl?.(artURL)} style={{ height: '100%' }} />
      <div className="bottomBadge">{overrideText ?? value}</div>
    </div>
  )
}

function getArtURL(value: string) {
  if (value.startsWith('opensky-crystal')) {
    return `rawPreviews/crystals/${value}.jpeg`
  }
  if (value.startsWith('cardback')) {
    return `rawPreviews/card-backs-premium/${value}.jpeg`
  }
  const [kind, _artist, _number] = value.split('-') as [ArtKind, Artist, `${number}`]
  const urlKind = kind + (kind === 'hero' ? 'es' : 's')
  return `rawPreviews/cards/art-full/${urlKind}/${value}.jpeg`
}
