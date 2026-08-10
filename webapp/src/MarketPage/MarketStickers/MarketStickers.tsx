import { memo } from 'react'

import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { MarketStickersEmptyList } from './components/MarketStickersEmptyList'
import { MarketStickersList } from './MarketStickersList/MarketStickersList'
import { MarketStickersSearchBar } from './MarketStickersSearchBar/MarketStickersSearchBar'

export const MarketStickers = memo(() => {
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
      <MarketStickersSearchBar />
      <MarketStickersEmptyList />
      <MarketStickersList />
    </div>
  )
})

MarketStickers.displayName = 'MarketStickers'
