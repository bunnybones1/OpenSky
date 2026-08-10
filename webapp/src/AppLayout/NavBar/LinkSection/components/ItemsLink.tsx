import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { makeItemsDecksRoute } from '~/shared/helpers/routes/items-decks'
import { useNumNewCardBacks } from '~/shared/hooks/card-backs/useNumNewCardBacks'
import { useNumNewCards } from '~/shared/hooks/cards/useNumNewCards'
import { useNumNewDecks } from '~/shared/hooks/decks/useNumNewDecks'
import { useNumNewHeroSkins } from '~/shared/hooks/hero-skins/useNumNewHeroSkins'
import { useNumNewStickers } from '~/shared/hooks/stickers/useNumNewStickers'
import { useAuthedAccount } from '~/shared/hooks/useAuthedAccount'
import { useSelector } from '~/shared/redux/index'
import {
  isItemsCardBacksRouteSelector,
  isItemsCardsRouteSelector,
  isItemsDecksRouteSelector,
  isItemsHeroesRouteSelector,
  isItemsStickersRouteSelector
} from '~/shared/redux/router/selectors'

import { NavBarLink } from '../../shared/components/NavBarLink/NavBarLink'

interface ItemsLinkProps {
  isHorizontal: boolean
}

export const ItemsLink = memo(({ isHorizontal }: ItemsLinkProps) => {
  const isItemCardBacksRoute = useSelector(isItemsCardBacksRouteSelector)
  const isItemsStickersRoute = useSelector(isItemsStickersRouteSelector)
  const isItemsHeroesRoute = useSelector(isItemsHeroesRouteSelector)
  const isItemsCardsRoute = useSelector(isItemsCardsRouteSelector)
  const isItemsDecksRoute = useSelector(isItemsDecksRouteSelector)

  const { data: acccount } = useAuthedAccount()

  const numNewHeroSkins = useNumNewHeroSkins()
  const numNewCardBacks = useNumNewCardBacks()
  const numNewStickers = useNumNewStickers()
  const { silverCount, baseCount, goldCount } = useNumNewCards()
  const numNewDecks = useNumNewDecks()

  const combinedCount =
    numNewCardBacks +
    numNewHeroSkins +
    numNewStickers +
    silverCount +
    baseCount +
    goldCount +
    numNewDecks

  const { t } = useTranslation()

  const isActive =
    isItemsCardsRoute ||
    isItemsStickersRoute ||
    isItemsHeroesRoute ||
    isItemCardBacksRoute ||
    isItemsDecksRoute

  return (
    <NavBarLink
      to={makeItemsDecksRoute()}
      text={t('navigation.items')}
      icon="items"
      id="items"
      unread={
        !!combinedCount && !isActive && !!acccount?.level ? combinedCount : undefined
      }
      isActive={isActive}
      isHorizontal={isHorizontal}
    />
  )
})

ItemsLink.displayName = 'ItemsLink'
