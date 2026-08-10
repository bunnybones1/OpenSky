import { produce } from 'immer'
import { matchPath } from 'react-router-dom'
import { proxy } from 'valtio'

import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { OwnershipFilter } from '~/shared/types/cards'
import { SharedStickerFilters } from '~/shared/types/filters'

const StickerArrayParams: string[] = []

const DEFAULT_FILTERS: SharedStickerFilters = {
  ownership: OwnershipFilter.OWNED,
  search: undefined,
  isEquipped: false
}

const instantiateState = () => {
  const match = matchPath(
    ROUTES_CONFIG.routes.ITEMS.routes.STICKERS.directPath,
    window.location.pathname
  )

  // If the first load is on the items stickers page, grab the params
  // from the URL and populate state with them.
  if (!!match) {
    const params = new URLSearchParams(window.location.search)

    const keys = Object.keys(DEFAULT_FILTERS) as (keyof SharedStickerFilters)[]

    return produce(DEFAULT_FILTERS, (draft) => {
      keys.forEach((key) => {
        if (params.has(key)) {
          const value = StickerArrayParams.includes(key)
            ? params.getAll(key)
            : params.get(key)
          if (!!value) {
            // @ts-ignore
            draft[key] = value
          }
        }
      })
    })
  } else {
    return DEFAULT_FILTERS
  }
}

export const itemsStickersFilterState = proxy<SharedStickerFilters>(
  instantiateState()
)

export const resetItemsStickersFilters = () => {
  itemsStickersFilterState.ownership = DEFAULT_FILTERS.ownership
  itemsStickersFilterState.search = DEFAULT_FILTERS.search
  itemsStickersFilterState.isEquipped = DEFAULT_FILTERS.isEquipped
}

export const updateItemsStickersFilters = <T extends keyof SharedStickerFilters>(
  key: T,
  value: SharedStickerFilters[T]
) => {
  itemsStickersFilterState[key] = value
}
