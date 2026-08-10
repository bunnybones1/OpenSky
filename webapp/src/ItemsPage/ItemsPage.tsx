import { memo } from 'react'
import { Route, Routes } from 'react-router-dom'
import { useLifecycles } from 'react-use'

import { FlexBox } from '~/shared/components/Base'
import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { page } from '~/shared/helpers/analytics-old'

import { ItemsPageSubNav } from './components/ItemsPageSubNav'
import { ItemsCardBackFeature } from './ItemsCardBackFeature/ItemsCardBackFeature'
import { ItemsCardbacks } from './ItemsCardbacks/ItemsCardbacks'
import { ItemsCardDetails } from './ItemsCardDetails/ItemsCardDetails'
import { ItemsCards } from './ItemsCards/ItemsCards'
import { ItemsDecks } from './ItemsDecks/ItemsDecks'
import { ItemsHeroes } from './ItemsHeroes/ItemsHeroes'
import { ItemsStickerFeature } from './ItemsStickerFeature/ItemsStickerFeature'
import { ItemsStickers } from './ItemsStickers/ItemsStickers'

export const ItemsPage = memo(() => {
  useLifecycles(
    () => {
      page('Items')
      document.body.classList.add('scrollBody')
    },
    () => {
      document.body.classList.remove('scrollBody')
    }
  )

  return (
    <FlexBox width="100%" height="auto" type="start-column">
      <ItemsPageSubNav />
      <Routes>
        <Route
          element={<ItemsCards />}
          path={ROUTES_CONFIG.routes.ITEMS.routes.CARDS.path}
        />
        <Route
          element={<ItemsCardDetails />}
          path={ROUTES_CONFIG.routes.ITEMS.routes.CARD.path}
        />
        <Route
          element={<ItemsDecks />}
          path={ROUTES_CONFIG.routes.ITEMS.routes.DECKS.path}
        />
        <Route
          element={<ItemsStickers />}
          path={ROUTES_CONFIG.routes.ITEMS.routes.STICKERS.path}
        />
        <Route
          element={<ItemsStickerFeature />}
          path={ROUTES_CONFIG.routes.ITEMS.routes.STICKER.path}
        />
        <Route
          element={<ItemsHeroes />}
          path={ROUTES_CONFIG.routes.ITEMS.routes.HEROES.path}
        />
        <Route
          element={<ItemsCardbacks />}
          path={ROUTES_CONFIG.routes.ITEMS.routes.CARDBACKS.path}
        />
        <Route
          element={<ItemsCardBackFeature />}
          path={ROUTES_CONFIG.routes.ITEMS.routes.CARDBACK.path}
        />
      </Routes>
    </FlexBox>
  )
})

ItemsPage.displayName = 'ItemsPage'

export default ItemsPage
