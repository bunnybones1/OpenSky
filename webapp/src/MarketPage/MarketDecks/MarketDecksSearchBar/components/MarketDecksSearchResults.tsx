import { PrismClass } from '@opensky/shared/constants'
import { getDeckClassFromPrisms } from '@opensky/shared/helpers'
import clsx from 'clsx'
import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSnapshot } from 'valtio'

import { Text } from '~/shared/components/Text'
import { useMarketDecks } from '~/shared/queries/decks/useMarketDecks'
import { marketDecksFilterState } from '~/shared/state/market-decks/market-decks-filter-state'
import { SearchResultsWrapper } from '~/shared/style/SearchbarStyle.css'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

const SearchResultsFontSize = {
  base: '12px',
  mobile: '14px',
  desktop: '16px'
} as const

export const MarketDecksSearchResults = memo(() => {
  const { column, prisms } = useSnapshot(marketDecksFilterState)

  const deckClass = useMemo(() => {
    return getDeckClassFromPrisms(
      // eslint-disable-next-line valtio/state-snapshot-rule
      prisms.map((prism) => prism.toUpperCase()) as PrismClass[]
    )
  }, [prisms])

  const { data: marketDecks } = useMarketDecks({ deckClass, column })

  const { t } = useTranslation()

  if (!marketDecks) return null

  return (
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
        {t('search.searchResults', { results: marketDecks.length })}
      </Text>
    </div>
  )
})

MarketDecksSearchResults.displayName = 'MarketDecksSearchResults'
