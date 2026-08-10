import { DECK_CARDS_REQUIRED } from '@opensky/shared/deckConsts'
import clsx from 'clsx'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { Text } from '~/shared/components/Text'
import { useDeckOwnedCards } from '~/shared/hooks/decks/useDeckOwnedCards'
import { useDecodedDeckString } from '~/shared/hooks/decks/useDecodedDeckString'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { CollectedCellContainer } from './CollectedCell.css'

interface CollectedCellProps {
  deckString: string
}

const FontSize = { base: '14px', tabletWide: '16px' } as const

export const CollectedCell = memo(({ deckString }: CollectedCellProps) => {
  const { t } = useTranslation()

  const { cardIds } = useDecodedDeckString(deckString)
  const ownedCards = useDeckOwnedCards(cardIds)

  return (
    <div
      className={Sprinkles({
        display: 'flex',
        width: 'full',
        height: 'full',
        justifyContent: 'center',
        alignItems: 'center',
        paddingX: '8px'
      })}
    >
      <div
        className={clsx(
          Sprinkles({
            width: 'full',
            position: 'relative',
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'purple7'
          }),
          CollectedCellContainer
        )}
      >
        <div
          className={Sprinkles({
            display: 'flex',
            width: 'full',
            height: 'full',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'absolute',
            left: 0,
            top: 0,
            zIndex: 2
          })}
        >
          <Text fontFamily="condensed" fontSize={FontSize} color="white">
            {t('ranks.craftProgress', {
              total: DECK_CARDS_REQUIRED,
              owned: ownedCards?.length || 0
            })}
          </Text>
        </div>
        <div
          className={Sprinkles({
            height: 'full',
            position: 'absolute',
            left: 0,
            top: 0,
            zIndex: 1,
            backgroundColor: 'purple5'
          })}
          style={{
            width: `${((ownedCards?.length || 0) / DECK_CARDS_REQUIRED) * 100}%`
          }}
        />
      </div>
    </div>
  )
})

CollectedCell.displayName = 'CollectedCell'
