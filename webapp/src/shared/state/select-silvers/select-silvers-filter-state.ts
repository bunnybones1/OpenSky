import { produce } from 'immer'
import { matchPath } from 'react-router-dom'
import { proxy } from 'valtio'

import { ROUTES_CONFIG } from '~/shared/constants/routes'
import {
  CARD_SORTING_OPTIONS,
  CardsArrayParams,
  CardSearchParams
} from '~/shared/types/cards'

export interface SelectSilversFilterParams {
  prism: CardSearchParams['prism']
  sort?: CardSearchParams['sort']
  onlyDuplicates?: boolean
}

const DEFAULT_FILTERS: SelectSilversFilterParams = {
  prism: undefined,
  onlyDuplicates: false,
  sort: CARD_SORTING_OPTIONS.PRICE_ASCENDING
}

const instantiateState = () => {
  const match = matchPath(
    ROUTES_CONFIG.routes.SELECT_SILVERS.routes.CARDS.directPath,
    window.location.pathname
  )

  // If the first load is on the market cards page, grab the params
  // from the URL and populate state with them.
  if (!!match) {
    const params = new URLSearchParams(window.location.search)

    const keys = Object.keys(DEFAULT_FILTERS) as (keyof SelectSilversFilterParams)[]

    return produce(DEFAULT_FILTERS, (draft) => {
      keys.forEach((key) => {
        if (params.has(key)) {
          const value = CardsArrayParams.includes(key)
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

export const selectSilversFilterState = proxy<SelectSilversFilterParams>(
  instantiateState()
)

export const resetSelectSilversFilterState = () => {
  selectSilversFilterState.prism = DEFAULT_FILTERS.prism
  selectSilversFilterState.sort = DEFAULT_FILTERS.sort
  selectSilversFilterState.onlyDuplicates = DEFAULT_FILTERS.onlyDuplicates
}

export const updateSelectSilversFilterState = <
  T extends keyof SelectSilversFilterParams
>(
  key: T,
  value: SelectSilversFilterParams[T]
) => {
  selectSilversFilterState[key] = value
}
