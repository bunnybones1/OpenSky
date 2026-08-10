import { ItemType } from '@opensky/proto'
import { getLegacyHeroID } from '@opensky/shared/assetsIDs'
import { HeroSkin } from '@opensky/shared/constants'
import { useEffect, useMemo } from 'react'

import { AllHeroSkinIds, AllHeroSkins } from '~/shared/constants/hero-skins'
import { Criteria, filterItems } from '~/shared/helpers/filter-items'
import { isDefined } from '~/shared/helpers/is-defined-is-not-null'
import { useTokenBalances } from '~/shared/queries/useTokenBalances'
import { MarketHeroesFilters } from '~/shared/state/market-heroes/market-heroes-filter-state'
import { OwnershipFilter } from '~/shared/types/cards'
import { SharedHeroesFilters } from '~/shared/types/hero-skins'
import { BalanceItem } from '~/shared/types/market'

type BaseSearchHeroesFilters = Pick<MarketHeroesFilters, 'search'>

type HeroesSearchCriteria = {
  [K in keyof BaseSearchHeroesFilters]: BaseSearchHeroesFilters[K] | undefined
}

const HERO_CRITERIA: Criteria<HeroSkin, HeroesSearchCriteria> = {
  search: {
    isApplied: (value) => !!value?.length,
    isFiltered: (hero, value) => {
      if (!value) return false

      return hero.name.toLowerCase().includes(value.toLowerCase())
    }
  }
}

const getHeroesFilteredByOwnership = (
  ids: number[],
  balances: BalanceItem[] | undefined | null,
  ownership: OwnershipFilter
) => {
  if (balances === undefined) return undefined
  if (!balances) return []
  const ownedIds = balances.map((item) => item.tokenID)
  return ids.filter((id) => {
    // eslint-disable-next-line valtio/state-snapshot-rule
    switch (ownership) {
      case OwnershipFilter.LOCKED: {
        return !ownedIds.includes(id)
      }
      case OwnershipFilter.OWNED: {
        return ownedIds.includes(id)
      }
      default:
        return true
    }
  })
}

export const useFilteredHeroSkinsList = (
  { ownership, search }: SharedHeroesFilters,
  onUpdate?: (numResults?: number) => void
) => {
  const { data: balances } = useTokenBalances(ItemType.SW_HERO_SKINS)

  const heroSkinList = useMemo(() => {
    let ids = getHeroesFilteredByOwnership(AllHeroSkinIds, balances, ownership)

    if (!ids) return undefined

    ids = filterItems({
      items: ids.map((id) => AllHeroSkins.get(id)).filter(isDefined),
      criteria: HERO_CRITERIA,
      filters: { search }
    }).map((hero) => {
      return getLegacyHeroID(hero.id)
    })

    return ids?.map((id) => ({ id }))
  }, [balances, ownership, search])

  useEffect(() => {
    if (!!onUpdate) {
      onUpdate(heroSkinList === null ? 0 : heroSkinList?.length)
    }
  }, [heroSkinList, onUpdate])

  return { heroSkinList }
}
