import { memo } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useMount, useUnmount } from 'react-use'

import { FlexBox } from '~/shared/components/Base'
import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { page } from '~/shared/helpers/analytics-old'

import { MarketPageSubNav } from './components/MarketPageSubNav'
import { MarketCardDetails } from './MarketCardDetails/MarketCardDetails'
import { MarketCards } from './MarketCards/MarketCards'
import MarketDecks from './MarketDecks/MarketDecks'
import { MarketStickerFeature } from './MarketStickerFeature/MarketStickerFeature'
import { MarketStickers } from './MarketStickers/MarketStickers'

export const IdentityMarketPage = memo(() => {
  useMount(() => {
    page('Shop')
    document.body.classList.add('scrollBody')
  })

  useUnmount(() => {
    document.body.classList.remove('scrollBody')
  })

  return (
    <FlexBox
      width="100%"
      height="auto"
      minHeight="100%"
      type="start-column"
      position="relative"
      overflow="scrollY"
    >
      <MarketPageSubNav />
      <Routes>
        <Route
          element={<MarketCards />}
          path={ROUTES_CONFIG.routes.MARKET.routes.CARDS.path}
        />
        <Route
          element={<MarketCardDetails />}
          path={ROUTES_CONFIG.routes.MARKET.routes.CARD.path}
        />
        <Route
          element={<MarketDecks />}
          path={ROUTES_CONFIG.routes.MARKET.routes.DECKS.path}
        />
        <Route
          element={<MarketStickers inventoryOnly />}
          path={ROUTES_CONFIG.routes.MARKET.routes.STICKERS.path}
        />
        <Route
          element={<MarketStickerFeature inventoryOnly />}
          path={ROUTES_CONFIG.routes.MARKET.routes.STICKER.path}
        />
        <Route
          path="*"
          element={
            <Navigate
              to={ROUTES_CONFIG.routes.MARKET.routes.DECKS.directPath}
              replace
            />
          }
        />
      </Routes>
    </FlexBox>
  )
})

IdentityMarketPage.displayName = 'IdentityMarketPage'
