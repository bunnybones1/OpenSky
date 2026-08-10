import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { push } from 'redux-first-history'

import { Button } from '~/shared/components/Button'
import { makeNavigateToDeckBuilderRoute } from '~/shared/helpers/routes/deck-builder'
import { makeCloseDeckViewerRoute } from '~/shared/helpers/routes/general'
import { makeDeckViewerRoute } from '~/shared/helpers/routes/items-decks'
import { useDeckOwnedCards } from '~/shared/hooks/decks/useDeckOwnedCards'
import { useDecodedDeckString } from '~/shared/hooks/decks/useDecodedDeckString'
import { useNavigateToSkyPass } from '~/shared/hooks/useNavigateToSkypass'
import { useCreateDeck } from '~/shared/mutations/decks/useCreateDeck'
import { useUnlockedDeckClasses } from '~/shared/queries/decks/useUnlockedDeckClasses'
import { useDispatch, useSelector } from '~/shared/redux'
import { deckBuilderState } from '~/shared/state/deck-builder/deck-builder-state'
import { FullWidthButtonStyle } from '~/shared/style/FullWidthButtonStyle.css'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  deckViewerDeckStringSelector,
  deckViewerIdSelector
} from '../shared/selectors'
import { AddMissingToCartButton } from './components/AddMissingToCartButton'
import { OwnedCardsCount } from './components/OwnedCardsCount'

const EditIcon = { icon: 'edit-deck' } as const

export const DeckViewerFooter = memo(() => {
  const dispatch = useDispatch()
  const { t } = useTranslation()
  const uuid = useSelector(deckViewerIdSelector)
  const deckString = useSelector(deckViewerDeckStringSelector)
  const { deckClass, cardIds } = useDecodedDeckString(deckString)
  const createDeck = useCreateDeck()
  const { data: unlockedDeckClasses } = useUnlockedDeckClasses()

  const ownedCards = useDeckOwnedCards(cardIds)

  const isDeckClassLocked =
    !unlockedDeckClasses || !deckClass || !unlockedDeckClasses.includes(deckClass)

  const isFullyUnlocked =
    !!cardIds && !!ownedCards && ownedCards.length === cardIds.length

  const navigateToDeck = useCallback(() => {
    if (!deckClass) return

    const currentLocation = makeCloseDeckViewerRoute()

    deckBuilderState.previousLocationPath = currentLocation

    if (!!uuid) {
      dispatch(
        push(
          makeNavigateToDeckBuilderRoute({
            uuid,
            prism: deckClass,
            deckString
          })
        )
      )
    } else {
      dispatch(push(makeNavigateToDeckBuilderRoute({ prism: deckClass, deckString })))
    }
  }, [deckClass, deckString, dispatch, uuid])

  const importDeck = useCallback(async () => {
    if (!deckString || !deckClass || !cardIds) return

    deckBuilderState.previousLocationPath = undefined

    const newDeck = await createDeck.mutateAsync({
      deckClass,
      deckString,
      name: t('decks.MarketDeck'),
      art: cardIds[0]
    })

    const uuid = newDeck.res.uuid

    dispatch(push(makeDeckViewerRoute(deckString, uuid)))
  }, [deckString, deckClass, cardIds, createDeck, t, dispatch])

  const { navigateToSkypass } = useNavigateToSkyPass()

  const onSkyPassClick = useCallback(() => {
    navigateToSkypass()
  }, [navigateToSkypass])

  if (!cardIds) return null

  return (
    <div
      className={Sprinkles({
        width: 'full',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'flex-start'
      })}
    >
      <OwnedCardsCount
        numTotalCards={cardIds.length}
        numOwnedCards={ownedCards?.length || 0}
      />
      <div
        className={Sprinkles({
          width: 'full',
          borderTop: '1px solid',
          borderColor: 'purple7',
          padding: '8px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'flex-start'
        })}
      >
        {!!uuid ? (
          <Button
            disabled={!deckClass}
            onClick={navigateToDeck}
            frameType="default"
            colorType={isFullyUnlocked ? 'blue' : 'default'}
            text={t('decks.EditDeck')}
            buttonId="edit-deck"
            leftAdornment={EditIcon}
            className={FullWidthButtonStyle}
            buttonClassName={FullWidthButtonStyle}
          />
        ) : isDeckClassLocked ? (
          <Button
            colorType="red"
            frameType="default"
            onClick={onSkyPassClick}
            text={t('createDeck.lockedPrism')}
            className={FullWidthButtonStyle}
            buttonClassName={FullWidthButtonStyle}
          />
        ) : (
          <Button
            colorType={isFullyUnlocked ? 'blue' : 'default'}
            frameType="default"
            buttonId="import-deck"
            onClick={importDeck}
            disabled={createDeck.isLoading}
            text={t('decks.ImportDeck')}
            leftAdornment={{ icon: createDeck.isLoading ? 'spinner' : 'save-deck' }}
            className={FullWidthButtonStyle}
            buttonClassName={FullWidthButtonStyle}
          />
        )}
        {!isFullyUnlocked && !isDeckClassLocked && (
          <AddMissingToCartButton deckString={deckString} />
        )}
      </div>
    </div>
  )
})

DeckViewerFooter.displayName = 'DeckViewerFooter'
