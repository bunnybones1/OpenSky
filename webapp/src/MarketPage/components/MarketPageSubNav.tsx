import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import env from '~/env'
import { SubNavButton } from '~/shared/components/SubNav/exported/SubNavButton'
import { SubNav } from '~/shared/components/SubNav/SubNav'
import { makeMarketHeroSkinsRoute } from '~/shared/helpers/routes/market-page'
import {
  makeMarketCardBacksRoute,
  makeMarketCardsRoute,
  makeMarketStickersRoute
} from '~/shared/helpers/routes/market-page'
import { makeNavigateToMarketDecksRoute } from '~/shared/helpers/routes/market-page'
import { useSelector } from '~/shared/redux/index'

import { marketCardBackFeatureIdSelector } from '../shared/selectors/marketCardBackFeatureIdSelector'
import { marketCardDetailsIdSelector } from '../shared/selectors/marketCardDetailsIdSelector'
import { marketStickerFeatureIdSelector } from '../shared/selectors/marketStickerFeatureIdSelector'

export const MarketPageSubNav = memo(() => {
  const { t } = useTranslation()
  const cardDetailsId = useSelector(marketCardDetailsIdSelector)
  const stickerDetailsId = useSelector(marketStickerFeatureIdSelector)
  const cardBackDetailsId = useSelector(marketCardBackFeatureIdSelector)

  if (!!cardDetailsId || !!stickerDetailsId || !!cardBackDetailsId) return null

  if (env.AUTH_MODE === 'google') {
    return (
      <SubNav>
        {[
          <SubNavButton
            key="cards"
            to={makeMarketCardsRoute()}
            text={t('shop.subNavCards')}
            icon="cards"
            id="cards"
          />,
          <SubNavButton
            key="decks"
            to={makeNavigateToMarketDecksRoute()}
            text={t('shop.subNavDecks')}
            icon="deck"
            id="decks"
          />,
          <SubNavButton
            key="stickers"
            to={makeMarketStickersRoute()}
            text={t('shop.subNavStickers')}
            icon="stickers"
            id="stickers"
          />
        ]}
      </SubNav>
    )
  }

  return (
    <SubNav>
      <SubNavButton
        to={makeMarketCardsRoute()}
        text={t('shop.subNavCards')}
        icon="cards"
        id="cards"
      />
      <SubNavButton
        to={makeNavigateToMarketDecksRoute()}
        text={t('shop.subNavDecks')}
        icon="deck"
        id="decks"
      />
      <SubNavButton
        to={makeMarketHeroSkinsRoute()}
        text={t('shop.subNavHeroes')}
        icon="heroes"
        id="heroes"
      />
      <SubNavButton
        to={makeMarketStickersRoute()}
        text={t('shop.subNavStickers')}
        icon="stickers"
        id="stickers"
      />
      <SubNavButton
        to={makeMarketCardBacksRoute()}
        text={t('shop.subNavCardBacks')}
        icon="card-back"
        id="card-backs"
      />
    </SubNav>
  )
})

MarketPageSubNav.displayName = 'MarketPageSubNav'
