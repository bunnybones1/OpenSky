import clsx from 'clsx'
import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { Button } from '~/shared/components/Button'
import { SearchBar } from '~/shared/components/SearchBar'
import { Text } from '~/shared/components/Text'
import { isSecretShopVisibleForMe } from '~/shared/helpers/handle-secret-features'
import { makeItemsCardBacksRoute } from '~/shared/helpers/routes/items-page'
import { useDispatch } from '~/shared/redux/index'
import { marketCardBacksState } from '~/shared/state/market-cardbacks/market-cardbacks-state'
import {
  BasicSearchBarStyle,
  SearchBarSideStyle,
  SearchResultsWrapper
} from '~/shared/style/SearchbarStyle.css'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { MarketCardBacksSearchInput } from './components/MarketCardBacksSearchInput'
import { MarketCardBacksSideSwitcher } from './components/MarketCardBacksSideSwitcher'
import { MarketCardBacksSortSelect } from './components/MarketStickersSortSelect'

const isSecretShopVisible = isSecretShopVisibleForMe()
const SearchResultsFontSize = {
  base: '12px',
  mobile: '14px',
  desktop: '16px'
} as const
const MarketButtonAdornment = { icon: 'shop' } as const

export const MarketCardBacksSearchBar = memo(() => {
  const { numSearchResults } = useSnapshot(marketCardBacksState)
  const { t } = useTranslation()
  const dispatch = useDispatch()

  const onItemsClick = useCallback(() => {
    dispatch(push(makeItemsCardBacksRoute()))
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
            <MarketCardBacksSideSwitcher />
            <MarketCardBacksSortSelect />
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
            <MarketCardBacksSearchInput />
          </div>
        </>
      )}
    </SearchBar>
  )
})

MarketCardBacksSearchBar.displayName = 'MarketCardBacksSearchBar'
