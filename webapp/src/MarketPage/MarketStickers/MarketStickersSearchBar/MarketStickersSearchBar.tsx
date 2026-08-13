import clsx from 'clsx'
import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { Button } from '~/shared/components/Button'
import { SearchBar } from '~/shared/components/SearchBar'
import { Text } from '~/shared/components/Text'
import { isSecretShopVisibleForMe } from '~/shared/helpers/handle-secret-features.js'
import { makeItemsStickersRoute } from '~/shared/helpers/routes/items-page'
import { useDispatch } from '~/shared/redux/index'
import { marketStickersState } from '~/shared/state/market-stickers/market-stickers-state'
import {
  BasicSearchBarStyle,
  SearchBarSideStyle,
  SearchResultsWrapper
} from '~/shared/style/SearchbarStyle.css'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { IdentityMarketStickersOwnershipFilter } from './components/IdentityMarketStickersOwnershipFilter'
import { MarketStickersSearchInput } from './components/MarketStickersSearchInput'
import { MarketStickersSideSwitcher } from './components/MarketStickersSideSwitcher'
import { MarketStickersSortSelect } from './components/MarketStickersSortSelect'

const isSecretShopVisible = isSecretShopVisibleForMe()
const MarketButtonAdornment = { icon: 'shop' } as const
const SearchResultsFontSize = {
  base: '12px',
  mobile: '14px',
  desktop: '16px'
} as const

interface MarketStickersSearchBarProps {
  inventoryOnly?: boolean
}

export const MarketStickersSearchBar = memo(
  ({ inventoryOnly }: MarketStickersSearchBarProps) => {
    const { numSearchResults } = useSnapshot(marketStickersState)
    const { t } = useTranslation()
    const dispatch = useDispatch()

    const onItemsClick = useCallback(() => {
      dispatch(push(makeItemsStickersRoute()))
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
              {inventoryOnly ? (
                <IdentityMarketStickersOwnershipFilter />
              ) : (
                <MarketStickersSideSwitcher />
              )}
              <MarketStickersSortSelect inventoryOnly={inventoryOnly} />
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
              <MarketStickersSearchInput />
            </div>
          </>
        )}
      </SearchBar>
    )
  }
)

MarketStickersSearchBar.displayName = 'MarketStickersSearchBar'
