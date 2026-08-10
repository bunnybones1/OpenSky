import clsx from 'clsx'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSnapshot } from 'valtio'

import { SearchBar } from '~/shared/components/SearchBar'
import { Text } from '~/shared/components/Text'
import { selectGoldsState } from '~/shared/state/select-golds/select-golds-state'
import {
  SearchBarSideStyle,
  SearchResultsWrapper
} from '~/shared/style/SearchbarStyle.css'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { SelectGoldsDuplicatesCheck } from './components/SelectGoldsDuplicatesCheck'
import { SelectGoldsPrismFilter } from './components/SelectGoldsPrismFilter'
import { SelectGoldsSortSelect } from './components/SelectGoldsSortSelect'
import { SelectSilversSearchBarStyle } from './SelectGoldsSearchBar.css'

const SearchResultsFontSize = {
  base: '12px',
  mobile: '14px',
  desktop: '16px'
} as const

export const SelectGoldsSearchBar = memo(() => {
  const { numSearchResults } = useSnapshot(selectGoldsState)
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
            <SelectGoldsSortSelect />
            <SelectGoldsDuplicatesCheck />
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
            <SelectGoldsPrismFilter />
          </div>
        </>
      )}
    </SearchBar>
  )
})

SelectGoldsSearchBar.displayName = 'SelectGoldsSearchBar'
