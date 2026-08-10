import clsx from 'clsx'
import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch } from 'react-redux'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { Button } from '~/shared/components/Button'
import { SearchBar } from '~/shared/components/SearchBar'
import { Text } from '~/shared/components/Text'
import { isSecretShopVisibleForMe } from '~/shared/helpers/handle-secret-features'
import { makeMarketHeroSkinsRoute } from '~/shared/helpers/routes/market-page'
import { itemsHeroesState } from '~/shared/state/items-heroes/items-heroes-state'
import {
  BasicSearchBarStyle,
  SearchBarSideStyle,
  SearchResultsWrapper
} from '~/shared/style/SearchbarStyle.css'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { ItemsHeroesOwnershipFilter } from './components/ItemsHeroesOwnershipFilter'
import { ItemsHeroesSearchInput } from './components/ItemsHeroesSearchInput'

const SearchResultsFontSize = {
  base: '12px',
  mobile: '14px',
  desktop: '16px'
} as const

const MarketButtonAdornment = { icon: 'shop' } as const

const isSecretShopVisible = isSecretShopVisibleForMe()

export const ItemsHeroesSearchBar = memo(() => {
  const { numSearchResults } = useSnapshot(itemsHeroesState)
  const { t } = useTranslation()
  const dispatch = useDispatch()

  const onMarketClick = useCallback(() => {
    dispatch(push(makeMarketHeroSkinsRoute()))
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
            <ItemsHeroesOwnershipFilter />
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
            <ItemsHeroesSearchInput />
          </div>
        </>
      )}
    </SearchBar>
  )
})

ItemsHeroesSearchBar.displayName = 'ItemsHeroesSearchBar'
