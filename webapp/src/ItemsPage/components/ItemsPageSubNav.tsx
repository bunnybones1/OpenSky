import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { SubNavButton } from '~/shared/components/SubNav/exported/SubNavButton'
import { SubNav } from '~/shared/components/SubNav/SubNav'
import { makeItemsDecksRoute } from '~/shared/helpers/routes/items-decks'
import {
  makeItemsCardBacksRoute,
  makeItemsCardsRoute,
  makeItemsHeroesRoute,
  makeItemsStickersRoute
} from '~/shared/helpers/routes/items-page'
import { useNumNewCardBacks } from '~/shared/hooks/card-backs/useNumNewCardBacks'
import { useNumNewCards } from '~/shared/hooks/cards/useNumNewCards'
import { useNumNewHeroSkins } from '~/shared/hooks/hero-skins/useNumNewHeroSkins'
import { useNumNewStickers } from '~/shared/hooks/stickers/useNumNewStickers'
import { useSelector } from '~/shared/redux/index'

import { itemsCardBackFeatureIdSelector } from '../shared/selectors/itemsCardBackFeatureIdSelector'
import { itemsCardDetailsIdSelector } from '../shared/selectors/itemsCardDetailsIdSelector'
import { itemsStickerFeatureIdSelector } from '../shared/selectors/itemsStickerFeatureIdSelector'

export const ItemsPageSubNav = memo(() => {
  const cardDetailsId = useSelector(itemsCardDetailsIdSelector)
  const stickerDetailsId = useSelector(itemsStickerFeatureIdSelector)
  const cardBackDetailsId = useSelector(itemsCardBackFeatureIdSelector)
  const { t } = useTranslation()

  const numNewHeroSkins = useNumNewHeroSkins()
  const numNewCardBacks = useNumNewCardBacks()
  const numNewStickers = useNumNewStickers()
  const { silverCount, baseCount, goldCount } = useNumNewCards()

  if (!!cardDetailsId || !!stickerDetailsId || !!cardBackDetailsId) return null

  const combinedCardCount = silverCount + baseCount + goldCount

  return (
    <SubNav>
      <SubNavButton
        to={makeItemsDecksRoute()}
        text={t('shop.subNavDecks')}
        icon="deck"
        id="decks"
      />
      <SubNavButton
        to={makeItemsCardsRoute()}
        text={t('shop.subNavCards')}
        icon="cards"
        unread={!!combinedCardCount ? combinedCardCount : undefined}
        id="cards"
      />
      <SubNavButton
        to={makeItemsHeroesRoute()}
        text={t('shop.subNavHeroes')}
        icon="heroes"
        unread={!!numNewHeroSkins ? numNewHeroSkins : undefined}
        id="heroes"
      />
      <SubNavButton
        to={makeItemsStickersRoute()}
        text={t('shop.subNavStickers')}
        icon="stickers"
        id="stickers"
        unread={!!numNewStickers ? numNewStickers : undefined}
      />
      <SubNavButton
        to={makeItemsCardBacksRoute()}
        text={t('shop.subNavCardBacks')}
        icon="card-back"
        id="card-backs"
        unread={!!numNewCardBacks ? numNewCardBacks : undefined}
      />
    </SubNav>
  )
})

ItemsPageSubNav.displayName = 'ItemsPageSubNav'
