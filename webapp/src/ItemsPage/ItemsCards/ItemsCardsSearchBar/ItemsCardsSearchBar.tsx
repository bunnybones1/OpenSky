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
import { makeMarketCardsRoute } from '~/shared/helpers/routes/market-page'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useBanners } from '~/shared/queries/useBanners'
import { itemsCardsState } from '~/shared/state/items-cards/items-cards-state'
import {
  BasicSearchBarStyle,
  SearchBarSideStyle,
  SearchResultsWrapper
} from '~/shared/style/SearchbarStyle.css'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { GradeFilter } from './components/ItemsCardsGradeFilter'
import { ItemsCardsOwnershipFilter } from './components/ItemsCardsOwnershipFilter'
import { ItemsCardsPrismFilter } from './components/ItemsCardsPrismFilter'
import { ItemsCardsSortSelect } from './components/ItemsCardsSortSelect'
import { ItemsCardsFilterPanel } from './ItemsCardsFilterPanel/ItemsCardsFilterPanel'
import { ItemsCardsSearchInput } from './shared/components/ItemsCardsSearchInput'

const isSecretShopVisible = isSecretShopVisibleForMe()
const FilterButtonAdornment = { icon: 'filter' } as const
const MarketButtonAdornment = { icon: 'shop' } as const

const SearchResultsFontSize = {
  base: '12px',
  mobile: '14px',
  desktop: '16px'
} as const

export const ItemsCardsSearchBar = memo(() => {
  const isTablet = useResponsiveQuery('tablet')
  const { numSearchResults } = useSnapshot(itemsCardsState)
  const { t } = useTranslation()
  const { data: banners } = useBanners()
  const dispatch = useDispatch()

  const onMarketClick = useCallback(() => {
    dispatch(push(makeMarketCardsRoute()))
  }, [dispatch])

  return (
    <SearchBar
      hasBannerMargin={!!banners?.length}
      background="default"
      justifyContent="flex-start"
      PanelFilters={ItemsCardsFilterPanel}
      className={BasicSearchBarStyle}
    >
      {(toggleFilterPanel) => (
        <>
          <div className={SearchBarSideStyle}>
            <ItemsCardsOwnershipFilter />
            <ItemsCardsSortSelect />
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
            <ItemsCardsPrismFilter />
            <GradeFilter />
            <Button
              text={t('general.filters')}
              colorType="default"
              leftAdornment={FilterButtonAdornment}
              frameType="default"
              buttonId="filter-button"
              onClick={toggleFilterPanel}
            />
            {isTablet && <ItemsCardsSearchInput />}
          </div>
        </>
      )}
    </SearchBar>
  )
})

ItemsCardsSearchBar.displayName = 'ItemsCardsSearchBar'
