import { ItemType } from '@opensky/proto'
import { getStickerID } from '@opensky/shared/assetsIDs'
import { Sticker } from '@opensky/shared/constants'
import { useEffect, useMemo } from 'react'

import { AllStickerIds, AllStickers } from '~/shared/constants/stickers'
import { Criteria, filterItems } from '~/shared/helpers/filter-items'
import { getTokensFilteredByOwnership } from '~/shared/helpers/get-tokens-filtered-by-ownership'
import { isDefined } from '~/shared/helpers/is-defined-is-not-null'
import { useEquippedItems } from '~/shared/queries/useEquippedItems'
import { useTokenBalances } from '~/shared/queries/useTokenBalances'
import { SharedStickerFilters } from '~/shared/types/filters'

type BaseSearchStickerFilters = Pick<SharedStickerFilters, 'search'>

type StickersSearchCriteria = {
  [K in keyof BaseSearchStickerFilters]: BaseSearchStickerFilters[K] | undefined
}

const STICKER_CRITERIA: Criteria<Sticker, StickersSearchCriteria> = {
  search: {
    isApplied: (value) => !!value?.length,
    isFiltered: (sticker, value) => {
      if (!value) return false

      return sticker.name.toLowerCase().includes(value.toLowerCase())
    }
  }
}

export const useFilteredStickerList = (
  { ownership, search, isEquipped }: SharedStickerFilters,
  onUpdate?: (numResults?: number) => void
) => {
  const { data: balances } = useTokenBalances(ItemType.SW_STICKERS)
  const { data: equippedStickers } = useEquippedItems(ItemType.SW_STICKERS)

  const stickersList = useMemo(() => {
    let ids = getTokensFilteredByOwnership(AllStickerIds, balances, ownership)
    if (!ids) return ids

    if (isEquipped) {
      ids = ids.filter((id) => {
        if (!equippedStickers) return false

        return !!equippedStickers.find(
          (sticker) => getStickerID(sticker.tokenID) === id
        )
      })
    }

    ids = filterItems({
      items: ids.map((id) => AllStickers.get(id)).filter(isDefined),
      criteria: STICKER_CRITERIA,
      filters: { search }
    }).map((sticker) => {
      return sticker.id
    })

    return ids.map((id) => ({ id }))
  }, [balances, equippedStickers, isEquipped, ownership, search])

  useEffect(() => {
    if (!!onUpdate) {
      onUpdate(stickersList?.length)
    }
  }, [stickersList, onUpdate])

  return { stickersList }
}
