import clsx from 'clsx'
import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { push } from 'redux-first-history'

import { Icon } from '~/shared/components/Icon/Icon'
import { Text } from '~/shared/components/Text'
import { alphaManaCardSort } from '~/shared/helpers/cards/alpha-mana-card-sort'
import { makeDeckViewerRoute } from '~/shared/helpers/routes/items-decks'
import { getDecodedDeckString } from '~/shared/hooks/decks/useDecodedDeckString'
import { useUserDeck } from '~/shared/queries/decks/useUserDecks'
import { useDispatch } from '~/shared/redux/index'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { DeckDetailsTooltipCard } from './components/DeckDetailsTooltipCard'
import { Container, TouchGradient } from './DeckDetailsTooltip.css'

interface DeckDetailsTooltipProps {
  uuid: string
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

const DeckDetailsTooltip = memo(
  ({ uuid, onMouseEnter, onMouseLeave }: DeckDetailsTooltipProps) => {
    const { data: deck } = useUserDeck(uuid)
    const dispatch = useDispatch()
    const { t } = useTranslation()

    const cardIds = useMemo(() => {
      const { cardIds } = getDecodedDeckString(deck?.deckString)

      if (!cardIds) return []

      return alphaManaCardSort(cardIds, t)
    }, [deck?.deckString, t])

    const onEditClick = useCallback(() => {
      if (!!deck) {
        dispatch(push(makeDeckViewerRoute(deck.deckString, deck.uuid)))
      }
    }, [deck, dispatch])

    const isTouchTooltip = !onMouseEnter && !onMouseLeave

    if (!deck) return null

    return (
      <div
        onMouseLeave={onMouseLeave}
        onMouseEnter={onMouseEnter}
        className={clsx(
          Container,
          Sprinkles({ padding: '8px', pointerEvents: 'all' }),
          { isTouchTooltip }
        )}
      >
        <Text
          color="purple9"
          fontFamily="condensed"
          fontSize="16px"
          fontWeight="500"
          className={Sprinkles({
            position: 'relative',
            top: 0,
            left: 0,
            display: 'flex',
            alignItems: 'center'
          })}
        >
          {t('deckBuilder.cardPreview')}
        </Text>
        <div
          style={{ overflowY: isTouchTooltip ? 'hidden' : 'auto' }}
          className={Sprinkles({
            position: 'relative',
            zIndex: 4,
            height: 'full'
          })}
        >
          {cardIds.map((id) => (
            <DeckDetailsTooltipCard key={id} id={id} />
          ))}
        </div>
        {!isTouchTooltip ? (
          <Text
            color="white"
            fontFamily="condensed"
            fontSize="16px"
            fontWeight="500"
            className={Sprinkles({
              position: 'relative',
              zIndex: 4,
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer'
            })}
            onClick={onEditClick}
          >
            <Icon
              type="gear"
              color="white"
              height="16px"
              style={{ marginRight: '8px' }}
            />
            {t('decks.EditDeck')}
          </Text>
        ) : (
          <div
            className={Sprinkles({
              width: 'full',
              position: 'relative',
              height: 'full'
            })}
          >
            <div
              className={clsx(
                Sprinkles({
                  width: 'full',
                  position: 'absolute',
                  left: 0,
                  bottom: 0,
                  pointerEvents: 'none',
                  zIndex: 5
                }),
                TouchGradient
              )}
            />
          </div>
        )}
      </div>
    )
  }
)

export default DeckDetailsTooltip

DeckDetailsTooltip.displayName = 'DeckDetailsTooltip'
