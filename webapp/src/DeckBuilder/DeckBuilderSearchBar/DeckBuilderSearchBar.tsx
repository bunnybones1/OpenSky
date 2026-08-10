import clsx from 'clsx'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSnapshot } from 'valtio'

import { Button } from '~/shared/components/Button'
import { SearchBar } from '~/shared/components/SearchBar'
import { Text } from '~/shared/components/Text'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useBanners } from '~/shared/queries/useBanners'
import { deckBuilderState } from '~/shared/state/deck-builder/deck-builder-state'
import {
  SearchBarSideStyle,
  SearchResultsWrapper
} from '~/shared/style/SearchbarStyle.css'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { DeckBuilderGradeFilter } from './components/DeckBuilderGradeFilter'
import { DeckBuilderOwnershipFilter } from './components/DeckBuilderOwnershipFilter'
import { DeckBuilderPrismsFilter } from './components/DeckBuilderPrismsFilter'
import { DeckBuilderSearchInput } from './components/DeckBuilderSearchInput'
import { DeckBuilderSortSelect } from './components/DeckBuilderSortSelect'
import { DeckBuilderFilterPanel } from './DeckBuilderFilterPanel/DeckBuilderFilterPanel'
import { DeckBuilderSearchBarStyle } from './DeckBuilderSearchBar.css'

const FilterButtonAdornment = { icon: 'filter' } as const
const SearchResultsFontSize = {
  base: '12px',
  mobile: '14px',
  desktop: '16px'
} as const

export const DeckBuilderSearchBar = memo(() => {
  const isDesktop = useResponsiveQuery('desktop')
  const { numSearchResults } = useSnapshot(deckBuilderState)
  const isMobile = useResponsiveQuery('mobile')
  const { t } = useTranslation()
  const { data: banners } = useBanners()

  return (
    <SearchBar
      hasBannerMargin={!!banners?.length}
      background="default"
      justifyContent="flex-start"
      PanelFilters={DeckBuilderFilterPanel}
      className={DeckBuilderSearchBarStyle}
      hasNoFilterPanelLeftPadding
    >
      {(toggleFilterPanel) => (
        <>
          <div className={SearchBarSideStyle}>
            {isDesktop && <DeckBuilderOwnershipFilter />}
            <DeckBuilderSortSelect />
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
            <DeckBuilderGradeFilter />
            <DeckBuilderPrismsFilter />
            <Button
              text={isMobile ? t('general.filters') : undefined}
              colorType="default"
              leftAdornment={FilterButtonAdornment}
              frameType="default"
              buttonId="filter-button"
              onClick={toggleFilterPanel}
            />
            {isDesktop && <DeckBuilderSearchInput />}
          </div>
        </>
      )}
    </SearchBar>
  )
})

DeckBuilderSearchBar.displayName = 'DeckBuilderSearchBar'
