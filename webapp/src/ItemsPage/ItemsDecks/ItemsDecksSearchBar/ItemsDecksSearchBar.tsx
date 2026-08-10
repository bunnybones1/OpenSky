import clsx from 'clsx'
import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { Button } from '~/shared/components/Button'
import { SearchBar } from '~/shared/components/SearchBar'
import { Text } from '~/shared/components/Text'
import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { isSecretShopVisibleForMe } from '~/shared/helpers/handle-secret-features'
import { makeNavigateToMarketDecksRoute } from '~/shared/helpers/routes/market-page'
import { useDispatch } from '~/shared/redux/index'
import { itemsDecksState } from '~/shared/state/items-decks/items-decks-state'
import {
  SearchBarSideStyle,
  SearchResultsWrapper
} from '~/shared/style/SearchbarStyle.css'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { ItemsDecksPrismFilter } from './components/ItemsDecksPrismFilter'
import { ItemsDecksSearchInput } from './components/ItemsDecksSearchInput'
import { ItemsDecksSort } from './components/ItemsDecksSort'
import { ItemsDecksSearchBarStyle } from './ItemsDecksSearchBar.css'

const isSecretShopVisible = isSecretShopVisibleForMe()
const MarketButtonAdornment = { icon: 'shop' } as const

const SearchResultsFontSize = {
  base: '12px',
  mobile: '14px',
  desktop: '16px'
} as const

export const ItemsDecksSearchBar = memo(() => {
  const { numSearchResults } = useSnapshot(itemsDecksState)
  const { t } = useTranslation()

  const dispatch = useDispatch()

  const onCreateNewDeck = useCallback(() => {
    dispatch(push(ROUTES_CONFIG.routes.CREATE_DECK.directPath))
  }, [dispatch])

  const onMarketClick = useCallback(() => {
    dispatch(push(makeNavigateToMarketDecksRoute()))
  }, [dispatch])

  return (
    <SearchBar
      background="default"
      justifyContent="flex-start"
      className={ItemsDecksSearchBarStyle}
    >
      {() => (
        <>
          <div className={SearchBarSideStyle}>
            {/* CreateDeckButton */}
            <ItemsDecksSort />
            <Button
              frameType="default"
              colorType="blue"
              leftAdornment={{ icon: 'plus' }}
              onClick={onCreateNewDeck}
              text={t('decks.CreateDeck')}
              buttonId="create-deck"
            />
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
            <ItemsDecksPrismFilter />
            <ItemsDecksSearchInput />
          </div>
        </>
      )}
    </SearchBar>
  )
})

ItemsDecksSearchBar.displayName = 'ItemsDecksSearchBar'
