import clsx from 'clsx'
import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { DeckLoader } from '~/shared/components/DeckListLoader/DeckListLoader'
import { Text } from '~/shared/components/Text'
import { Cards } from '~/shared/constants/cards'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { RelatedDeck } from './components/RelatedDeck'
import { useRelatedDecks } from './queries/useRelatedDecks'
import { RelatedDecksGrid } from './RelatedDecks.css'

interface RelatedDecksProps {
  id: number
}

export const RelatedDecks = memo(({ id }: RelatedDecksProps) => {
  const card = useMemo(() => Cards.get(id), [id])

  const isDisabled = !card || card.type === 'enchant' || card.prism === 'tok'

  const { data: decks } = useRelatedDecks(isDisabled ? undefined : id)

  const { t } = useTranslation()

  if (isDisabled || decks === null || (!!decks && !decks.length)) return null

  return (
    <div
      className={Sprinkles({
        width: 'full',
        border: '1px solid',
        borderColor: 'purple5',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        backgroundColor: 'purple2',
        paddingX: '16px'
      })}
    >
      <Text
        fontSize="26px"
        color="white"
        fontWeight="600"
        fontFamily="condensed"
        marginTop="16px"
        marginBottom="12px"
        className={Sprinkles({
          textAlign: 'center',
          width: 'full'
        })}
      >
        {t('cardDetails.relatedDecks')}
      </Text>
      <div
        className={clsx(
          Sprinkles({
            width: 'full',
            display: 'grid'
          }),
          RelatedDecksGrid
        )}
      >
        {!!decks ? (
          decks.map((deck) => (
            <RelatedDeck
              key={deck.deckString}
              score={deck.score}
              deckString={deck.deckString}
            />
          ))
        ) : (
          <>
            <DeckLoader />
            <DeckLoader />
            <DeckLoader />
          </>
        )}
      </div>
    </div>
  )
})

RelatedDecks.displayName = 'RelatedDecks'
