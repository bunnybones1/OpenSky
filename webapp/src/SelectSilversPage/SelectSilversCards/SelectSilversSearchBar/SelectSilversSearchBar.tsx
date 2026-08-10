import clsx from 'clsx'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSnapshot } from 'valtio'

import { SearchBar } from '~/shared/components/SearchBar'
import { Text } from '~/shared/components/Text'
import { selectSilversState } from '~/shared/state/select-silvers/select-silvers-state'
import {
  SearchBarSideStyle,
  SearchResultsWrapper
} from '~/shared/style/SearchbarStyle.css'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { SelectSilversDuplicateCheck } from './components/SelectSilversDuplicatesCheck'
import { SelectSilversPrismFilter } from './components/SelectSilversPrismFilter'
import { SelectSilversSortSelect } from './components/SelectSilversSortSelect'
import { SelectSilversSearchBarStyle } from './SelectSilversSearchBar.css'

const SearchResultsFontSize = {
  base: '12px',
  mobile: '14px',
  desktop: '16px'
} as const

export const SelectSilversSearchBar = memo(() => {
  const { numSearchResults } = useSnapshot(selectSilversState)
  const { t } = useTranslation()

  return (
    <SearchBar
      background="default"
      justifyContent="flex-start"
      className={SelectSilversSearchBarStyle}
    >
      {() => (
        <>
          <div className={SearchBarSideStyle}>
            <SelectSilversSortSelect />
            <SelectSilversDuplicateCheck />
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
            <SelectSilversPrismFilter />
          </div>
        </>
      )}
    </SearchBar>
  )
})

SelectSilversSearchBar.displayName = 'SelectSilversSearchBar'
