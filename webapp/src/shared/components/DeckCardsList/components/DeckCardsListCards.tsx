import { DeckClass } from '@opensky/proto'
import { DECKCLASS_ABILITIES } from '@opensky/shared/constants'
import { BaseCard, CardLibrary } from '@skyweaver/state-metadata'
import clsx from 'clsx'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ComponentType,
  memo,
  MouseEvent,
  useCallback,
  useMemo,
  useState
} from 'react'

import { DeckViewerAbilityRow } from '~/AppLayout/DeckViewer/components/DeckViewerAbilityRow'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { DeckCardsListBreakdown } from '../components/DeckCardsListBreakdown'
import { DeckCardsListCardsStyle } from './DeckCardsListCards.css'

const DEFAULT_CARD_IDS: BaseCard[] = []

interface DeckCardsListCardProps {
  id: BaseCard
  CardRowComponent: ComponentType<{ id: BaseCard; isAnimating?: boolean }>
}

const DeckCardsListCard = memo(({ id, CardRowComponent }: DeckCardsListCardProps) => {
  const [isAnimating, setIsAnimating] = useState(false)

  const onContextMenu = useCallback((event: MouseEvent) => {
    event.preventDefault()
  }, [])

  const onAnimationStart = useCallback(() => setIsAnimating(true), [])
  const onAnimationEnd = useCallback(() => setIsAnimating(false), [])

  return (
    <motion.div
      key={id}
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 100, opacity: 0 }}
      transition={{ duration: 0.15 }}
      onContextMenu={onContextMenu}
      onAnimationStart={onAnimationStart}
      onAnimationComplete={onAnimationEnd}
      className={Sprinkles({
        paddingLeft: '8px',
        paddingRight: '16px',
        borderColor: 'purple6'
      })}
    >
      <CardRowComponent isAnimating={isAnimating} id={id} />
    </motion.div>
  )
})

DeckCardsListCard.displayName = 'DeckCardsListCard'

interface DeckCardsListCardsProps {
  CardRowComponent: ComponentType<{ id: BaseCard; isAnimating?: boolean }>
  cardIds: BaseCard[]
  deckClass: DeckClass | undefined
}

export const DeckCardsListCards = memo(
  ({ CardRowComponent, cardIds, deckClass }: DeckCardsListCardsProps) => {
    const cardIdsWithCostSpacer = useMemo(() => {
      const toReturn: (BaseCard | number)[] = []

      cardIds.forEach((id, index) => {
        const card = CardLibrary.get(id)

        const nextId = cardIds[index + 1]

        const nextCard = !!nextId ? CardLibrary.get(nextId) : undefined

        if (!!card) {
          toReturn.push(id)

          if (!nextId || (!!nextCard && nextCard.cost !== card.cost)) {
            if (typeof card.cost === 'string') {
              toReturn.push(100)
            } else {
              toReturn.push(card.cost)
            }
          }
        }
      })

      return toReturn
    }, [cardIds])

    return (
      <div
        className={clsx(
          Sprinkles({
            width: 'full',
            backgroundColor: 'purple3'
          }),
          DeckCardsListCardsStyle
        )}
      >
        {deckClass && (
          <div
            className={Sprinkles({
              paddingLeft: '8px',
              paddingRight: '16px',
              paddingY: { base: '8px', tabletWide: '4px' },
              borderBottom: '1px solid',
              borderRight: '1px solid',
              borderColor: 'purple6'
            })}
          >
            <DeckViewerAbilityRow id={DECKCLASS_ABILITIES[deckClass] as BaseCard} />
          </div>
        )}
        <DeckCardsListBreakdown cardIds={cardIds || DEFAULT_CARD_IDS} />
        <div
          className={Sprinkles({
            borderRight: '1px solid',
            borderColor: 'purple6'
          })}
        >
          <AnimatePresence initial={false}>
            {cardIdsWithCostSpacer.map((id) =>
              typeof id === 'number' ? (
                <motion.div
                  key={`spacer-${id}`}
                  initial={{ x: 100, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 100, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  style={{ width: '100%', height: '12px' }}
                />
              ) : (
                <DeckCardsListCard
                  key={id}
                  CardRowComponent={CardRowComponent}
                  id={id}
                />
              )
            )}
          </AnimatePresence>
        </div>
      </div>
    )
  }
)

DeckCardsListCards.displayName = 'DeckCardsListCards'
