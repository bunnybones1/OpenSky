import { memo } from 'react'

import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { ItemsStickersEmptyList } from './components/ItemsStickersEmptyList'
import { ItemsStickersList } from './ItemsStickersList/ItemsStickersList'
import { ItemsStickersSearchBar } from './ItemsStickersSearchBar/ItemsStickersSearchBar'

export const ItemsStickers = memo(() => {
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
      <ItemsStickersSearchBar />
      <ItemsStickersEmptyList />
      <ItemsStickersList />
    </div>
  )
})

ItemsStickers.displayName = 'ItemsStickers'
