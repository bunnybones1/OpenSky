import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useMatch } from 'react-router-dom'

import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { isSecretShopVisibleForMe } from '~/shared/helpers/handle-secret-features'
import { makeMarketCardsRoute } from '~/shared/helpers/routes/market-page'
import { useIsMarketEnabled } from '~/shared/hooks/useIsMarketEnabled'
import { useCart } from '~/shared/queries/useCart'
import { useSelector } from '~/shared/redux/index'
import { isMarketRouteSelector } from '~/shared/redux/router/selectors'

import { NavBarLink } from '../../shared/components/NavBarLink/NavBarLink'

const isSecretShopVisible = isSecretShopVisibleForMe()

interface MarketLinkProps {
  isHorizontal: boolean
}

export const MarketLink = memo(({ isHorizontal }: MarketLinkProps) => {
  const isMarketRoute = useSelector(isMarketRouteSelector)

  const isShop = useMatch(ROUTES_CONFIG.routes.SHOP.directPath)

  const isMarketEnabled = useIsMarketEnabled()

  const { data: cart } = useCart()

  const cartCount = useMemo(() => {
    if (!cart) return undefined

    return cart.reduce((prev, curr) => {
      if (!curr || !curr.amount || !curr.side || !curr.tokenId || !curr.type) {
        return prev
      }
      return prev + curr.amount
    }, 0)
  }, [cart])

  const { t } = useTranslation()

  if (!isMarketEnabled) return null

  return (
    <NavBarLink
      to={
        isSecretShopVisible
          ? ROUTES_CONFIG.routes.SHOP.directPath
          : makeMarketCardsRoute()
      }
      isActive={isSecretShopVisible ? !!isShop : isMarketRoute}
      text={isSecretShopVisible ? t('navigation.shop') : t('navigation.market')}
      icon="shop"
      id="market"
      unread={isSecretShopVisible ? undefined : cartCount}
      isHorizontal={isHorizontal}
    />
  )
})

MarketLink.displayName = 'MarketLink'
