/* eslint-disable valtio/state-snapshot-rule */
import { ItemType } from '@opensky/proto'
import { getCardBackID } from '@opensky/shared/assetsIDs'
import { CardBack } from '@opensky/shared/constants'
import { useEffect, useMemo } from 'react'

import { AllCardBackIds, AllCardBacks } from '~/shared/constants/card-backs'
import { Criteria, filterItems } from '~/shared/helpers/filter-items'
import { getTokensFilteredByOwnership } from '~/shared/helpers/get-tokens-filtered-by-ownership'
import { isDefined } from '~/shared/helpers/is-defined-is-not-null'
import { useEquippedItems } from '~/shared/queries/useEquippedItems'
import { useSeasonInfo } from '~/shared/queries/useSeasonInfo'
import { useTokenBalances } from '~/shared/queries/useTokenBalances'
import { SharedCardBackFilters } from '~/shared/types/filters'

type BaseSearchCardBacksFilters = Pick<SharedCardBackFilters, 'search'>

type CardBacksSearchCriteria = {
  [K in keyof BaseSearchCardBacksFilters]: BaseSearchCardBacksFilters[K] | undefined
}

const CARDBACK_CRITERIA: Criteria<CardBack, CardBacksSearchCriteria> = {
  search: {
    isApplied: (value) => !!value?.length,
    isFiltered: (cardBack, value) => {
      if (!value) return false

      return cardBack.name.toLowerCase().includes(value.toLowerCase())
    }
  }
}

export const useFilteredCardBacksList = (
  { ownership, search, isEquipped }: SharedCardBackFilters,
  onUpdate?: (numResults?: number) => void
) => {
  const { data: balances } = useTokenBalances(ItemType.SW_CARD_BACKS)
  const { data: equippedCardBacks } = useEquippedItems(ItemType.SW_CARD_BACKS)
  const { data: seasonInfo } = useSeasonInfo()

  const cardBacksList = useMemo(() => {
    let ids = getTokensFilteredByOwnership(AllCardBackIds, balances, ownership)
    if (!ids) return ids

    ids = ids.filter((id) => {
      const cardBack = AllCardBacks.get(id)
      if (
        !!seasonInfo &&
        !!cardBack?.releaseSeason &&
        cardBack.releaseSeason > seasonInfo.currentSeason
      ) {
        return false
      }
      return true
    })

    if (isEquipped) {
      ids = ids.filter((id) => {
        if (!equippedCardBacks) return false

        return !!equippedCardBacks.find(
          (cardBack) => getCardBackID(cardBack.tokenID) === id
        )
      })
    }

    ids = filterItems({
      items: ids.map((id) => AllCardBacks.get(id)).filter(isDefined),
      criteria: CARDBACK_CRITERIA,
      filters: { search }
    }).map((cardBack) => {
      return cardBack.id
    })

    return ids.map((id) => ({ id }))
  }, [balances, equippedCardBacks, isEquipped, ownership, search, seasonInfo])

  useEffect(() => {
    if (!!onUpdate) {
      onUpdate(cardBacksList?.length)
    }
  }, [cardBacksList, onUpdate])

  return { cardBacksList }
}
