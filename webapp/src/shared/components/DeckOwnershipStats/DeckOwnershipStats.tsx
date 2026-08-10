import clsx from 'clsx'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { Icon } from '~/shared/components/Icon/Icon'
import { Text } from '~/shared/components/Text'
import { useDeckOwnedCards } from '~/shared/hooks/decks/useDeckOwnedCards'
import { useDecodedDeckString } from '~/shared/hooks/decks/useDecodedDeckString'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { DeckOwnershipBar } from './DeckOwnershipStats.css'

interface DeckOwnershipStatsProps {
  deckString: string
}

export const DeckOwnershipStats = memo(({ deckString }: DeckOwnershipStatsProps) => {
  const { cardIds } = useDecodedDeckString(deckString)

  const ownedCards = useDeckOwnedCards(cardIds)

  const { t } = useTranslation()

  const isFullyOwned =
    !!ownedCards && !!cardIds && ownedCards.length === cardIds?.length

  if (!cardIds) return null

  return (
    <div
      className={Sprinkles({
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start'
      })}
    >
      <div
        className={Sprinkles({
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-start',
          width: 'full'
        })}
      >
        {!isFullyOwned && <Icon type="lock-diamond" color="warm7" height="20px" />}
        <Text
          color={isFullyOwned ? 'forest4' : 'warm5'}
          fontSize="12px"
          marginLeft={isFullyOwned ? undefined : '4px'}
          fontWeight="500"
        >
          {ownedCards?.length || 0}
        </Text>
        <Text
          color={isFullyOwned ? 'forest4' : 'purple9'}
          fontSize="12px"
          fontWeight="500"
          marginRight="auto"
        >
          {`/${cardIds.length} ${t('cards.cardsOwned')}`}
        </Text>
        {isFullyOwned && <Icon type="check" color="forest4" height="10px" />}
      </div>
      <div
        className={clsx(
          DeckOwnershipBar,
          Sprinkles({ position: 'relative', marginTop: '4px' })
        )}
      >
        {!!ownedCards && (
          <div
            className={Sprinkles({
              height: 'full',
              position: 'absolute',
              zIndex: 1,
              backgroundColor: isFullyOwned ? 'forest4' : 'warm5'
            })}
            style={{
              width: `${(ownedCards.length / cardIds.length) * 100}%`
            }}
          />
        )}
        <div
          className={Sprinkles({
            width: 'full',
            height: 'full',
            backgroundColor: 'purple5'
          })}
        />
      </div>
    </div>
  )
})

DeckOwnershipStats.displayName = 'DeckOwnershipStats'
