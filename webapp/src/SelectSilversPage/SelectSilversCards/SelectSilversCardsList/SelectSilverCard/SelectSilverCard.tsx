import clsx from 'clsx'
import { memo, useCallback, useMemo } from 'react'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { Card } from '~/shared/components/Card/Card'
import { CardType } from '~/shared/constants/cards'
import { makeSelectSilverCardDetailsRoute } from '~/shared/helpers/routes/general'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { useDispatch } from '~/shared/redux'
import { selectSilversState } from '~/shared/state/select-silvers/select-silvers-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { SelectSilverBalance } from './SelectSilverBalance/SelectSilverBalance'
import { SelectedStyle } from './SelectSilverCard.css'

export interface SelectSilverCardProps {
  id: number
}

export const SelectSilverCard = memo(({ id }: SelectSilverCardProps) => {
  const dispatch = useDispatch()
  const { getAssetUrl } = useGetAssetContext()
  const { selectedCards } = useSnapshot(selectSilversState)

  const onCardClick = useCallback(
    (card: CardType) => {
      dispatch(push(makeSelectSilverCardDetailsRoute(card.id)))
    },
    [dispatch]
  )

  const isSelected = useMemo(() => {
    // eslint-disable-next-line valtio/state-snapshot-rule
    return !!selectedCards.find((card) => card.id === id)
  }, [id, selectedCards])

  return (
    <div
      className={Sprinkles({
        width: 'full',
        position: 'relative'
      })}
    >
      <Card
        id={id}
        onClick={onCardClick}
        isOverlayEnabled
        BalanceAndPriceInfo={SelectSilverBalance}
      />
      {!!getAssetUrl && (
        <div
          className={clsx(
            Sprinkles({ position: 'absolute', opacity: 0 }),
            SelectedStyle,
            { isSelected }
          )}
        >
          <img
            src={getAssetUrl('webapp/cards/full-cards/frame-highlight.webp')}
            className={Sprinkles({ width: 'full' })}
          />
        </div>
      )}
    </div>
  )
})

SelectSilverCard.displayName = 'SelectSilverCard'
