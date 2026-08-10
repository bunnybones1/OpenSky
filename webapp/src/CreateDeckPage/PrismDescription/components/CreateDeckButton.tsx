import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { createDeckState } from '~/CreateDeckPage/shared/state/create-deck-state'
import { Button } from '~/shared/components/Button'
import { makeNavigateToDeckBuilderRoute } from '~/shared/helpers/routes/deck-builder'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useNavigateToSkyPass } from '~/shared/hooks/useNavigateToSkypass'
import { useUnlockedDeckClasses } from '~/shared/queries/decks/useUnlockedDeckClasses'
import { useDispatch } from '~/shared/redux'
import { FullWidthButtonStyle } from '~/shared/style/FullWidthButtonStyle.css'

import { CreateDeckButtonStyle } from './CreateDeckButton.css'

export const CreateDeckButton = memo(() => {
  const { data: unlockedDeckClasses } = useUnlockedDeckClasses()
  const { deckString, deckStringError, deckClass } = useSnapshot(createDeckState)
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const isTablet = useResponsiveQuery('tablet')

  const isLocked = useMemo(() => {
    // eslint-disable-next-line valtio/state-snapshot-rule
    return !unlockedDeckClasses || !unlockedDeckClasses.includes(deckClass)
  }, [unlockedDeckClasses, deckClass])

  const { navigateToSkypass } = useNavigateToSkyPass()

  const handleClick = useCallback(() => {
    if (isLocked) {
      navigateToSkypass()
      return
    }

    dispatch(
      push(
        makeNavigateToDeckBuilderRoute({
          prism: deckClass,
          deckString
        })
      )
    )
  }, [deckClass, deckString, dispatch, isLocked, navigateToSkypass])

  return (
    <div className={CreateDeckButtonStyle}>
      <Button
        className={FullWidthButtonStyle}
        buttonClassName={FullWidthButtonStyle}
        onClick={handleClick}
        disabled={!!deckStringError || isLocked}
        frameType="default"
        colorType="blue"
        height={isTablet ? '52px' : '32px'}
        buttonId="constructDeck"
        text={t(
          `createDeck.${
            isLocked ? 'lockedPrism' : !!deckString ? 'importDeck' : 'constructDeck'
          }`
        )}
      />
    </div>
  )
})

CreateDeckButton.displayName = 'CreateDeckButton'
