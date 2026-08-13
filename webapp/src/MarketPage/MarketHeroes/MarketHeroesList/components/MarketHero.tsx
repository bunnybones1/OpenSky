import { ItemType } from '@opensky/proto'
import { HeroSkin } from '@opensky/shared/constants'
import { memo, useCallback, useMemo } from 'react'
import { push } from 'redux-first-history'

import { Hero } from '~/shared/components/Hero/Hero'
import { HeroBalanceAndPriceInfo } from '~/shared/components/HeroBalanceAndPriceInfo'
import { BalanceOrPrice } from '~/shared/components/ItemBalanceAndPriceInfo/ItemBalanceAndPriceInfo'
import { formatUSDCBalance } from '~/shared/helpers/market/format-usdc-balance'
import { makeHeroRoute } from '~/shared/helpers/routes/general'
import { makeMarketHeroSkinsRoute } from '~/shared/helpers/routes/market-page'
import { useHeroSkinMintCost } from '~/shared/queries/hero-skins/useHeroSkinMintCost'
import { useTokenBalance } from '~/shared/queries/useTokenBalances'
import { useDispatch } from '~/shared/redux/index'

export interface MarketHeroProps {
  id: number
  inventoryOnly?: boolean
}

const IdentityMarketHeroBalance = memo(({ id }: MarketHeroProps) => {
  const { data: balance } = useTokenBalance(ItemType.SW_HERO_SKINS, id)

  const balances = useMemo<BalanceOrPrice[] | undefined>(() => {
    if (balance === undefined) return undefined
    return [
      {
        amount: !!balance ? balance.balance : 0,
        icon: { type: 'heroes-gold' },
        id: 'HERO'
      }
    ]
  }, [balance])

  return (
    <HeroBalanceAndPriceInfo
      balances={balances}
      id={id}
      areBalancesLoading={balances === undefined}
    />
  )
})

IdentityMarketHeroBalance.displayName = 'IdentityMarketHeroBalance'

const MarketHeroBalance = memo(({ id }: MarketHeroProps) => {
  const { data: balance } = useTokenBalance(ItemType.SW_HERO_SKINS, id)
  const { data: price } = useHeroSkinMintCost(id, 1)

  const balances = useMemo<BalanceOrPrice[] | undefined>(() => {
    if (balance === undefined) return undefined
    return [
      {
        amount: !!balance ? balance.balance : 0,
        icon: { type: 'heroes-gold' },
        id: 'HERO'
      }
    ]
  }, [balance])

  const prices = useMemo<BalanceOrPrice[] | undefined | null>(() => {
    if (price === undefined) return undefined
    if (!price) return null
    return [
      {
        amount: `$${formatUSDCBalance(price)}`,
        id: 'HERO'
      }
    ]
  }, [price])

  return (
    <HeroBalanceAndPriceInfo
      balances={balances}
      prices={prices || undefined}
      id={id}
      areBalancesLoading={balances === undefined}
      arePricesLoading={prices === undefined}
    />
  )
})

MarketHeroBalance.displayName = 'MarketHeroBalance'

export const MarketHero = memo(({ id, inventoryOnly }: MarketHeroProps) => {
  const dispatch = useDispatch()

  const onClick = useCallback(
    (heroSkin: HeroSkin) => {
      dispatch(
        push(`${makeHeroRoute(heroSkin.id)}?from=${makeMarketHeroSkinsRoute()}`)
      )
    },
    [dispatch]
  )

  return (
    <Hero
      id={id}
      isTiltable
      onClick={onClick}
      BalanceAndPriceInfo={
        inventoryOnly ? IdentityMarketHeroBalance : MarketHeroBalance
      }
    />
  )
})

MarketHero.displayName = 'MarketHero'
