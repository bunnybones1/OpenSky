import clsx from 'clsx'
import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { Button } from '~/shared/components/Button'
import { SearchBar } from '~/shared/components/SearchBar'
import { Text } from '~/shared/components/Text'
import { isSecretShopVisibleForMe } from '~/shared/helpers/handle-secret-features.js'
import { makeItemsHeroesRoute } from '~/shared/helpers/routes/items-page'
import { useDispatch } from '~/shared/redux/index'
import { marketHeroesState } from '~/shared/state/market-heroes/market-heroes-state'
import {
  BasicSearchBarStyle,
  SearchBarSideStyle,
  SearchResultsWrapper
} from '~/shared/style/SearchbarStyle.css'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { MarketHeroesSearchInput } from './components/ItemsHeroesSearchInput'
import { MarketHeroesOwnershipFilter } from './components/MarketHeroesOwnershipFilter'
import { MarketHeroesSortSelect } from './components/MarketHeroesSort'

const isSecretShopVisible = isSecretShopVisibleForMe()
const MarketButtonAdornment = { icon: 'shop' } as const
const SearchResultsFontSize = {
  base: '12px',
  mobile: '14px',
  desktop: '16px'
} as const

interface MarketHeroesSearchBarProps {
  inventoryOnly?: boolean
}

export const MarketHeroesSearchBar = memo(
  ({ inventoryOnly }: MarketHeroesSearchBarProps) => {
    const { numSearchResults } = useSnapshot(marketHeroesState)
    const { t } = useTranslation()

    const dispatch = useDispatch()

    const onItemsClick = useCallback(() => {
      dispatch(push(makeItemsHeroesRoute()))
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
              <MarketHeroesOwnershipFilter />
              <MarketHeroesSortSelect inventoryOnly={inventoryOnly} />
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
                  isToggled
                  onClick={onItemsClick}
                  leftAdornment={MarketButtonAdornment}
                />
              )}
              <MarketHeroesSearchInput />
            </div>
          </>
        )}
      </SearchBar>
    )
  }
)

MarketHeroesSearchBar.displayName = 'MarketHeroesSearchBar'
