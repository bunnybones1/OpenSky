import clsx from 'clsx'
import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import env from '~/env'
import { Button } from '~/shared/components/Button'
import { SearchBar } from '~/shared/components/SearchBar'
import { Text } from '~/shared/components/Text'
import { isSecretShopVisibleForMe } from '~/shared/helpers/handle-secret-features'
import { makeItemsCardsRoute } from '~/shared/helpers/routes/items-page'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useBanners } from '~/shared/queries/useBanners'
import { useDispatch } from '~/shared/redux/index'
import { marketCardsState } from '~/shared/state/market-cards/market-cards-state'
import {
  SearchBarSideStyle,
  SearchResultsWrapper
} from '~/shared/style/SearchbarStyle.css'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { IdentityMarketCardsOwnershipFilter } from './components/IdentityMarketCardsOwnershipFilter'
import { MarketCardsGradeFilter } from './components/MarketCardsGradeFilter'
import { MarketCardsPrismFilter } from './components/MarketCardsPrismFilter'
import { MarketCardsSideSwitcher } from './components/MarketCardsSideSwitcher'
import { MarketCardsSortSelect } from './components/MarketCardsSortSelect'
import { MarketCardsFilterPanel } from './MarketCardsFilterPanel/MarketCardsFilterPanel'
import { MarketCardsSearchBarStyle } from './MarketCardsSearchBar.css'
import { MarketCardsSearchInput } from './shared/components/MarketCardsSearchInput'

const isSecretShopVisible = isSecretShopVisibleForMe()
const FilterButtonAdornment = { icon: 'filter' } as const
const MarketButtonAdornment = { icon: 'shop' } as const

const SearchResultsFontSize = {
  base: '12px',
  mobile: '14px',
  desktop: '16px'
} as const

export const MarketCardsSearchBar = memo(() => {
  const isTabletWide = useResponsiveQuery('tabletWide')
  const { numSearchResults } = useSnapshot(marketCardsState)
  const { t } = useTranslation()
  const { data: banners } = useBanners()
  const dispatch = useDispatch()

  const onItemsClick = useCallback(() => {
    dispatch(push(makeItemsCardsRoute()))
  }, [dispatch])

  return (
    <SearchBar
      hasBannerMargin={!!banners?.length}
      background="default"
      justifyContent="flex-start"
      PanelFilters={MarketCardsFilterPanel}
      className={MarketCardsSearchBarStyle}
    >
      {(toggleFilterPanel) => (
        <>
          <div className={SearchBarSideStyle}>
            {env.AUTH_MODE === 'google' ? (
              <IdentityMarketCardsOwnershipFilter />
            ) : (
              <MarketCardsSideSwitcher />
            )}
            <MarketCardsSortSelect />
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
            <MarketCardsPrismFilter />
            <MarketCardsGradeFilter />
            <Button
              text={t('general.filters')}
              colorType="default"
              leftAdornment={FilterButtonAdornment}
              frameType="default"
              buttonId="filter-button"
              onClick={toggleFilterPanel}
            />
            {isTabletWide && <MarketCardsSearchInput />}
          </div>
        </>
      )}
    </SearchBar>
  )
})

MarketCardsSearchBar.displayName = 'MarketCardsSearchBar'
