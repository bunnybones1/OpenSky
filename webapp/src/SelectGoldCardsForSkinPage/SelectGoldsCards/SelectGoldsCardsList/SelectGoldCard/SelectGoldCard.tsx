import clsx from 'clsx'
import { memo, useCallback, useMemo } from 'react'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { Card } from '~/shared/components/Card/Card'
import { CardType } from '~/shared/constants/cards'
import { makeSelectGoldCardDetailsRoute } from '~/shared/helpers/routes/general'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { useDispatch } from '~/shared/redux'
import { selectGoldsState } from '~/shared/state/select-golds/select-golds-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { SelectGoldBalance } from './SelectGoldBalance/SelectGoldBalance'
import { SelectedStyle } from './SelectGoldCard.css'

export interface SelectGoldCardProps {
  id: number
}

export const SelectGoldCard = memo(({ id }: SelectGoldCardProps) => {
  const dispatch = useDispatch()
  const { getAssetUrl } = useGetAssetContext()
  const { selectedCards } = useSnapshot(selectGoldsState)

  const onCardClick = useCallback(
    (card: CardType) => {
      dispatch(push(makeSelectGoldCardDetailsRoute(card.id)))
    },
    [dispatch]
  )

  const isSelected = useMemo(() => {
    // eslint-disable-next-line valtio/state-snapshot-rule
    return !!selectedCards.find((card) => card.tokenId === id)
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
        BalanceAndPriceInfo={SelectGoldBalance}
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

SelectGoldCard.displayName = 'SelectGoldCard'
