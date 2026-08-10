import { getItemType } from '@opensky/shared/assetsIDs'
import clsx from 'clsx'
import { memo, useCallback, useMemo } from 'react'

import { useAddOrRemoveDeckBuilderCard } from '~/DeckBuilder/shared/hooks/useAddOrRemoveDeckBuilderCard'
import { deckBuilderDeckStringSelector } from '~/DeckBuilder/shared/selectors'
import { SoundClient } from '~/shared/clients'
import { Card } from '~/shared/components/Card/Card'
import { Cards, CardType } from '~/shared/constants/cards'
import { useDecodedDeckString } from '~/shared/hooks/decks/useDecodedDeckString'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { useTokenBalance } from '~/shared/queries/useTokenBalances'
import { useSelector } from '~/shared/redux'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { DeckBuilderCardBalance } from './components/DeckBuilderCardBalance'
import {
  DeckBuilderCardSelectedStyle,
  DeckBuilderCardStyle
} from './DeckBuilderCard.css'
export interface DeckBuilderCardProps {
  id: number
}

const OverlayPadding = { top: 83, left: 0, right: 300, bottom: 0 } as const

export const DeckBuilderCard = memo(({ id }: DeckBuilderCardProps) => {
  const { addOrRemoveDeckBuilderCard } = useAddOrRemoveDeckBuilderCard()
  const { getAssetUrl } = useGetAssetContext()

  const deckString = useSelector(deckBuilderDeckStringSelector)
  const { cardIds } = useDecodedDeckString(deckString)

  const isSelected = useMemo(() => {
    const card = Cards.get(id)
    return cardIds && !!card && cardIds.includes(card.baseId)
  }, [id, cardIds])

  const { data: balance } = useTokenBalance(getItemType(id), id)

  const onCardClick = useCallback(
    (card: CardType) => {
      SoundClient.playSound('CursorCardClick')
      addOrRemoveDeckBuilderCard(card.baseId)
    },
    [addOrRemoveDeckBuilderCard]
  )

  return (
    <div
      className={clsx(
        Sprinkles({
          width: 'full',
          position: 'relative'
        }),
        DeckBuilderCardStyle
      )}
    >
      <Card
        id={id}
        onClick={onCardClick}
        isOverlayEnabled
        isLocked={!balance || !balance.balance}
        showLoadingFrame
        overlayPadding={OverlayPadding}
        BalanceAndPriceInfo={DeckBuilderCardBalance}
      />
      {!!isSelected && !!getAssetUrl && (
        <div
          className={clsx(
            Sprinkles({ position: 'absolute' }),
            DeckBuilderCardSelectedStyle
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

DeckBuilderCard.displayName = 'DeckBuilderCard'
