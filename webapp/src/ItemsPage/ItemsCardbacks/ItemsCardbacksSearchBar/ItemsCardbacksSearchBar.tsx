import clsx from 'clsx'
import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { Button } from '~/shared/components/Button'
import { SearchBar } from '~/shared/components/SearchBar'
import { Text } from '~/shared/components/Text'
import { isSecretShopVisibleForMe } from '~/shared/helpers/handle-secret-features'
import { makeMarketCardBacksRoute } from '~/shared/helpers/routes/market-page'
import { useDispatch } from '~/shared/redux/index'
import { itemsCardbacksState } from '~/shared/state/items-cardbacks/items-cardbacks-state'
import {
  BasicSearchBarStyle,
  SearchBarSideStyle,
  SearchResultsWrapper
} from '~/shared/style/SearchbarStyle.css'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { ItemsCardBacksEquippedCheck } from './components/ItemsCardBacksEquippedCheck'
import { ItemsCardbacksOwnershipFilter } from './components/ItemsCardbacksOwnershipFilter'

const isSecretShopVisible = isSecretShopVisibleForMe()
const SearchResultsFontSize = {
  base: '12px',
  mobile: '14px',
  desktop: '16px'
} as const

const MarketButtonAdornment = { icon: 'shop' } as const

export const ItemsHeroesSearchBar = memo(() => {
  const { numSearchResults } = useSnapshot(itemsCardbacksState)
  const { t } = useTranslation()
  const dispatch = useDispatch()

  const onMarketClick = useCallback(() => {
    dispatch(push(makeMarketCardBacksRoute()))
  }, [dispatch])

  return (
    <SearchBar
      background="default"
      justifyContent="flex-start"
      className={BasicSearchBarStyle}
    >
      {() => (
        <>
          <div className={SearchBarSideStyle}>
            <ItemsCardbacksOwnershipFilter />
            {numSearchResults !== undefined && (
              <div
                className={clsx(
                  Sprinkles({
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start'
                  }),
                  SearchResultsWrapper
                )}
              >
                <Text color="purple9" fontSize={SearchResultsFontSize}>
                  {t('search.searchResults', { results: numSearchResults })}
                </Text>
              </div>
            )}
          </div>
          <div className={clsx(SearchBarSideStyle, 'isRight')}>
            {!!isSecretShopVisible && (
              <Button
                frameType="rounded"
                colorType="default"
                onClick={onMarketClick}
                leftAdornment={MarketButtonAdornment}
              />
            )}
            <ItemsCardBacksEquippedCheck />
          </div>
        </>
      )}
    </SearchBar>
  )
})

ItemsHeroesSearchBar.displayName = 'ItemsHeroesSearchBar'
