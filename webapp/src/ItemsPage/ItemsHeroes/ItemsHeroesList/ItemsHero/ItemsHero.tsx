import { ItemType } from '@opensky/proto'
import { HeroSkin } from '@opensky/shared/constants'
import { useQueryClient } from '@tanstack/react-query'
import { memo, useCallback, useMemo } from 'react'
import { push } from 'redux-first-history'

import { Hero } from '~/shared/components/Hero/Hero'
import { HeroBalanceAndPriceInfo } from '~/shared/components/HeroBalanceAndPriceInfo'
import { BalanceOrPrice } from '~/shared/components/ItemBalanceAndPriceInfo/ItemBalanceAndPriceInfo'
import { ItemNewBadge } from '~/shared/components/ItemNewBadge'
import { getTokenBalancesKey } from '~/shared/constants/react-query-keys'
import { makeHeroRoute } from '~/shared/helpers/routes/general'
import { makeItemsHeroesRoute } from '~/shared/helpers/routes/items-page'
import { useTokenBalance } from '~/shared/queries/useTokenBalances'
import { useDispatch } from '~/shared/redux/index'
import { authenticationState } from '~/shared/state/authentication-state'
import { BalanceItem } from '~/shared/types/market'

import { useMarkHerosNotNew } from './useMarkHeroNotNew'

export interface ItemsHeroProps {
  id: number
}

const ItemsHeroNewTag = memo(({ id }: ItemsHeroProps) => {
  const { data: balance } = useTokenBalance(ItemType.SW_HERO_SKINS, id)
  const markHeroesNotNew = useMarkHerosNotNew()
  const queryClient = useQueryClient()

  const onHide = useCallback(() => {
    const isNew = !!queryClient
      .getQueryData<BalanceItem[] | null | undefined>(
        getTokenBalancesKey(ItemType.SW_HERO_SKINS, authenticationState.userAddress)
      )
      ?.find((_balance) => _balance.tokenID === id)?.isNew

    if (isNew) {
      markHeroesNotNew.mutate([id])
    }
  }, [id, markHeroesNotNew, queryClient])

  if (!balance) return null

  return <ItemNewBadge isNew={!!balance.isNew} onHide={onHide} />
})

ItemsHeroNewTag.displayName = 'ItemsHeroNewTag'

const ItemsHeroBalance = memo(({ id }: ItemsHeroProps) => {
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

ItemsHeroBalance.displayName = 'ItemsHeroBalance'

export const ItemsHero = memo(({ id }: ItemsHeroProps) => {
  const { data: balance } = useTokenBalance(ItemType.SW_HERO_SKINS, id)

  const dispatch = useDispatch()

  const onClick = useCallback(
    (heroSkin: HeroSkin) => {
      dispatch(push(`${makeHeroRoute(heroSkin.id)}?from=${makeItemsHeroesRoute()}`))
    },
    [dispatch]
  )

  const markHeroesNotNew = useMarkHerosNotNew()

  const onHover = useCallback(() => {
    markHeroesNotNew.mutate([id])
  }, [id, markHeroesNotNew])

  return (
    <Hero
      id={id}
      onHover={!!balance?.isNew ? onHover : undefined}
      isLocked={!balance || balance.balance === 0}
      isTiltable
      onClick={onClick}
      BalanceAndPriceInfo={ItemsHeroBalance}
      NewBadge={ItemsHeroNewTag}
    />
  )
})

ItemsHero.displayName = 'ItemsHero'
