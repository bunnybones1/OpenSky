import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { ToggleButton } from '~/shared/components/ToggleButton'
import { ToggleButtonGroup } from '~/shared/components/ToggleButtonGroup'
import { makeMarketDecksSearchRoute } from '~/shared/helpers/routes/market-page'
import { useDispatch } from '~/shared/redux'
import {
  marketDecksFilterState,
  updateMarketDecksFilterState
} from '~/shared/state/market-decks/market-decks-filter-state'
import { MARKET_DECK_COLUMN_TYPE, MarketDecksFilters } from '~/shared/types/market'

const FlagIcon = { icon: 'checkered-flag' } as const
const StarIcon = { icon: 'star-empty' } as const

export const MarketDecksColumnSwitcher = memo(() => {
  const { column } = useSnapshot(marketDecksFilterState)
  const dispatch = useDispatch()

  const onChange = useCallback(
    (value: MarketDecksFilters['column']) => {
      if (value === marketDecksFilterState.column) return
      updateMarketDecksFilterState('column', value)
      dispatch(push(makeMarketDecksSearchRoute()))
    },
    [dispatch]
  )

  const { t } = useTranslation()

  if (!column) return null

  return (
    <ToggleButtonGroup
      height="36px"
      colorType="default"
      value={column}
      onChange={onChange}
    >
      <ToggleButton
        value={MARKET_DECK_COLUMN_TYPE.TOP_DECKS}
        text={t('shop.deckElo')}
        leftAdornment={FlagIcon}
      />
      <ToggleButton
        value={MARKET_DECK_COLUMN_TYPE.MOST_PLAYED}
        text={t('shop.deckGamesPlayed')}
        leftAdornment={StarIcon}
      />
    </ToggleButtonGroup>
  )
})

MarketDecksColumnSwitcher.displayName = 'MarketDecksColumnSwitcher'
