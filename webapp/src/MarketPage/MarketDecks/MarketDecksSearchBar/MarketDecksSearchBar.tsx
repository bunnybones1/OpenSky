import clsx from 'clsx'
import { memo, useCallback } from 'react'
import { push } from 'redux-first-history'

import { Button } from '~/shared/components/Button'
import { SearchBar } from '~/shared/components/SearchBar'
import { isSecretShopVisibleForMe } from '~/shared/helpers/handle-secret-features'
import { makeItemsDecksRoute } from '~/shared/helpers/routes/items-decks'
import { useDispatch } from '~/shared/redux/index'
import { SearchBarSideStyle } from '~/shared/style/SearchbarStyle.css'

import { MarketDecksColumnSwitcher } from './components/MarketDecksColumnSwitcher'
import { MarketDecksPrismFilter } from './components/MarketDecksPrismFilter'
import { MarketDecksSearchResults } from './components/MarketDecksSearchResults'
import { MarketDecksSearchBarStyle } from './MarketDecksSearchBar.css'

const isSecretShopVisible = isSecretShopVisibleForMe()
const MarketButtonAdornment = { icon: 'shop' } as const

export const MarketDecksSearchBar = memo(() => {
  const dispatch = useDispatch()

  const onItemsClick = useCallback(() => {
    dispatch(push(makeItemsDecksRoute()))
  }, [dispatch])

  return (
    <SearchBar
      background="default"
      justifyContent="flex-start"
      className={MarketDecksSearchBarStyle}
    >
      {() => (
        <>
          <div className={SearchBarSideStyle}>
            <MarketDecksColumnSwitcher />
            <MarketDecksSearchResults />
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
            <MarketDecksPrismFilter />
          </div>
        </>
      )}
    </SearchBar>
  )
})

MarketDecksSearchBar.displayName = 'MarketDecksSearchBar'
