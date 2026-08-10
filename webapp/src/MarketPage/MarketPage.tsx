import { memo } from 'react'
import { Route, Routes } from 'react-router-dom'
import { useMount, useUnmount } from 'react-use'

import { FlexBox } from '~/shared/components/Base'
import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { page } from '~/shared/helpers/analytics-old'
import { useIsMarketEnabled } from '~/shared/hooks/useIsMarketEnabled'
import { useSelector } from '~/shared/redux/index'

import MarketDisabled from './components/MarketDisabled'
import { MarketPageSubNav } from './components/MarketPageSubNav'
import { MarketCardBackFeature } from './MarketCardBackFeature/MarketCardBackFeature'
import { MarketCardBacks } from './MarketCardBacks/MarketCardBacks'
import { MarketCardDetails } from './MarketCardDetails/MarketCardDetails'
import { MarketCards } from './MarketCards/MarketCards'
import MarketDecks from './MarketDecks/MarketDecks'
import { MarketHeroes } from './MarketHeroes/MarketHeroes'
import { MarketStickerFeature } from './MarketStickerFeature/MarketStickerFeature'
import { MarketStickers } from './MarketStickers/MarketStickers'
import { marketCardDetailsIdSelector } from './shared/selectors/marketCardDetailsIdSelector'
import { ViewOrderButton } from './ViewOrderButton/ViewOrderButton'

export const MarketPage = memo(() => {
  const cardDetailsId = useSelector(marketCardDetailsIdSelector)

  useMount(() => {
    page('Shop')
    document.body.classList.add('scrollBody')
  })

  useUnmount(() => {
    document.body.classList.remove('scrollBody')
  })

  const isMarketEnabled = useIsMarketEnabled()

  return (
    <FlexBox
      width="100%"
      height="auto"
      minHeight="100%"
      type="start-column"
      position="relative"
      overflow="scrollY"
    >
      {!isMarketEnabled && <MarketDisabled />}
      {isMarketEnabled && (
        <>
          <MarketPageSubNav />
          <Routes>
            <Route
              element={<MarketDecks />}
              path={ROUTES_CONFIG.routes.MARKET.routes.DECKS.path}
            />
            <Route
              element={<MarketCards />}
              path={ROUTES_CONFIG.routes.MARKET.routes.CARDS.path}
            />
            <Route
              element={<MarketCardDetails />}
              path={ROUTES_CONFIG.routes.MARKET.routes.CARD.path}
            />
            <Route
              element={<MarketHeroes />}
              path={ROUTES_CONFIG.routes.MARKET.routes.HEROES.path}
            />
            <Route
              element={<MarketStickers />}
              path={ROUTES_CONFIG.routes.MARKET.routes.STICKERS.path}
            />
            <Route
              element={<MarketStickerFeature />}
              path={ROUTES_CONFIG.routes.MARKET.routes.STICKER.path}
            />
            <Route
              element={<MarketCardBacks />}
              path={ROUTES_CONFIG.routes.MARKET.routes.CARDBACKS.path}
            />
            <Route
              element={<MarketCardBackFeature />}
              path={ROUTES_CONFIG.routes.MARKET.routes.CARDBACK.path}
            />
          </Routes>
          {!cardDetailsId && <ViewOrderButton />}
        </>
      )}
    </FlexBox>
  )
})

MarketPage.displayName = 'MarketPage'
