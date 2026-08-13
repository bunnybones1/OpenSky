import { memo } from 'react'

import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { MarketStickersEmptyList } from './components/MarketStickersEmptyList'
import { MarketStickersList } from './MarketStickersList/MarketStickersList'
import { MarketStickersSearchBar } from './MarketStickersSearchBar/MarketStickersSearchBar'

interface MarketStickersProps {
  inventoryOnly?: boolean
}

export const MarketStickers = memo(({ inventoryOnly }: MarketStickersProps) => {
  return (
    <div
      className={Sprinkles({
        width: 'full',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'flex-start'
      })}
    >
      <MarketStickersSearchBar inventoryOnly={inventoryOnly} />
      <MarketStickersEmptyList />
      <MarketStickersList inventoryOnly={inventoryOnly} />
    </div>
  )
})

MarketStickers.displayName = 'MarketStickers'
